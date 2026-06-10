(function () {
  // Admin feature: user management, impersonation, and the audit log.
  // Extracted from app.js to keep that file focused. Follows the shared
  // factory pattern: app.js wires in dependencies and cross-cutting helpers.
  const AUDIT_LOG_PAGE_SIZE = 25;

  const create = ({
    request,
    t,
    showStatusToast,
    setText,
    getCurrentUser,
    setCurrentUser,
    isAdminUser,
    resetFinancialModules,
    applyUserPreferences,
    applyTranslations,
    identifyMonitoringUser,
    trackEvent,
    disconnectRealtime,
    connectRealtime,
    setCurrentView,
    showSection,
    confirmDeleteUser,
    currentLanguage,
  }) => {
    // ---- DOM refs (owned by this module) ----
    const adminMessage = document.getElementById('admin-message');
    const impersonateUserSelect = document.getElementById('impersonate-user-select');
    const sendSummaryEmailButton = document.getElementById('send-summary-email');
    const sendNotesEmailButton = document.getElementById('send-notes-email');
    const userList = document.getElementById('user-list');
    const auditLogList = document.getElementById('audit-log-list');
    const auditLogPagination = document.getElementById('audit-log-pagination');
    const auditLogPrevious = document.getElementById('audit-log-previous');
    const auditLogNext = document.getElementById('audit-log-next');
    const auditLogPageInfo = document.getElementById('audit-log-page-info');
    const auditLogSearchInput = document.getElementById('audit-log-search-input');
    const refreshAuditLog = document.getElementById('refresh-audit-log');
    const openAddUserModalButton = document.getElementById('open-add-user-modal');
    const adminUserModal = document.getElementById('admin-user-modal');
    const adminUserModalTitle = document.getElementById('admin-user-modal-title');
    const adminUserForm = document.getElementById('admin-user-form');
    const adminNameInput = document.getElementById('admin-name');
    const adminUsernameInput = document.getElementById('admin-username');
    const adminEmailInput = document.getElementById('admin-email');
    const adminStatusInput = document.getElementById('admin-status');
    const adminPasswordField = document.getElementById('admin-password-field');
    const adminPasswordInput = document.getElementById('admin-password');
    const adminUserFormError = document.getElementById('admin-user-form-error');
    const cancelAdminUser = document.getElementById('cancel-admin-user');
    const saveAdminUser = document.getElementById('save-admin-user');
    const resetPasswordModal = document.getElementById('reset-password-modal');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const resetPasswordInput = document.getElementById('reset-password-input');
    const resetPasswordError = document.getElementById('reset-password-error');
    const cancelResetPassword = document.getElementById('cancel-reset-password');

    // ---- State (owned by this module) ----
    let users = [];
    let auditLogs = [];
    let auditLogPage = 1;
    let auditLogSearchTimer = null;
    let pendingAdminUser = null;
    let pendingResetPasswordUser = null;

    const loadUsers = async () => {
      adminMessage.textContent = '';
      const result = await request('/api/admin/users');
      if (result.error) {
        adminMessage.textContent = result.error;
        return;
      }
      users = result.users || [];
      renderImpersonateOptions(users);
      renderUsers(users);
      auditLogPage = 1;
      await loadAuditLogs();
    };

    const renderAuditLogPagination = (pagination) => {
      if (!auditLogPagination || !auditLogPageInfo || !auditLogPrevious || !auditLogNext) return;
      if (!pagination || pagination.totalPages <= 1) {
        auditLogPagination.classList.add('hidden');
        return;
      }

      auditLogPagination.classList.remove('hidden');
      auditLogPageInfo.textContent = t('pageStatus', {
        page: pagination.page,
        totalPages: pagination.totalPages,
        total: pagination.total,
      });
      auditLogPrevious.disabled = !pagination.hasPreviousPage;
      auditLogNext.disabled = !pagination.hasNextPage;
    };

    const loadAuditLogs = async (page = auditLogPage) => {
      if (!isAdminUser()) return;
      const params = new URLSearchParams({
        page: String(page),
        limit: String(AUDIT_LOG_PAGE_SIZE),
      });
      const search = auditLogSearchInput?.value.trim() || '';
      if (search) params.set('q', search);

      const result = await request(`/api/admin/audit-logs?${params.toString()}`);
      if (result.error) {
        adminMessage.textContent = result.error;
        return;
      }
      auditLogs = result.logs || [];
      auditLogPage = result.pagination?.page || 1;
      renderAuditLogs(auditLogs);
      renderAuditLogPagination(result.pagination);
    };

    const scheduleAuditLogSearch = () => {
      if (auditLogSearchTimer) clearTimeout(auditLogSearchTimer);
      auditLogSearchTimer = setTimeout(() => {
        auditLogPage = 1;
        loadAuditLogs(1);
      }, 250);
    };

    const renderImpersonateOptions = (list) => {
      if (!impersonateUserSelect) return;
      impersonateUserSelect.innerHTML = '';

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = t('impersonate');
      impersonateUserSelect.append(placeholder);

      list
        .filter((user) => user.username !== 'admin')
        .forEach((user) => {
          const option = document.createElement('option');
          option.value = String(user.id);
          option.textContent = user.name ? `${user.username} (${user.name})` : user.username;
          option.disabled = user.account_status !== 'enabled';
          impersonateUserSelect.append(option);
        });

      impersonateUserSelect.value = '';
      impersonateUserSelect.disabled = impersonateUserSelect.options.length <= 1;
    };

    const renderUsers = (list = users) => {
      userList.innerHTML = '';
      const currentUser = getCurrentUser();

      list.forEach((user) => {
        const row = document.createElement('tr');

        const usernameCell = document.createElement('td');
        usernameCell.dataset.label = t('username');
        usernameCell.textContent = user.username;

        const nameCell = document.createElement('td');
        nameCell.dataset.label = t('name');
        nameCell.textContent = user.name || '';

        const emailCell = document.createElement('td');
        emailCell.dataset.label = t('email');
        emailCell.textContent = user.email || '';

        const statusCell = document.createElement('td');
        statusCell.dataset.label = t('userStatus');
        const statusBadge = document.createElement('span');
        const isDisabled = user.account_status === 'disabled';
        const isPending = user.account_status === 'pending_verification';
        statusBadge.className = `user-status-badge ${isDisabled || isPending ? 'disabled' : 'enabled'}`;
        statusBadge.textContent = isPending
          ? t('userPendingStatus')
          : (isDisabled ? t('userDisabledStatus') : t('userEnabledStatus'));
        statusCell.append(statusBadge);

        const taskCountCell = document.createElement('td');
        taskCountCell.dataset.label = t('tasks');
        const taskBadge = document.createElement('span');
        taskBadge.className = 'user-task-badge';
        taskBadge.textContent = user.task_count;
        taskCountCell.append(taskBadge);

        const noteCountCell = document.createElement('td');
        noteCountCell.dataset.label = t('notes');
        const noteBadge = document.createElement('span');
        noteBadge.className = 'user-task-badge';
        noteBadge.textContent = user.note_count;
        noteCountCell.append(noteBadge);

        const actionsCell = document.createElement('td');
        actionsCell.dataset.label = t('actions');
        const actions = document.createElement('div');
        actions.className = 'user-actions';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'task-action-icon';
        editButton.textContent = '✎';
        editButton.setAttribute('aria-label', t('edit'));
        editButton.title = t('edit');
        editButton.addEventListener('click', () => showAdminUserModal(user));

        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.className = 'task-action-icon';
        resetButton.textContent = '🔑';
        resetButton.setAttribute('aria-label', t('resetPassword'));
        resetButton.title = t('resetPassword');
        resetButton.addEventListener('click', () => resetUserPassword(user));

        actions.append(editButton, resetButton);

        if (user.username !== 'admin' && user.id !== currentUser.id) {
          const statusButton = document.createElement('button');
          statusButton.type = 'button';
          statusButton.className = `task-action-icon ${isDisabled ? '' : 'secondary'}`;
          statusButton.textContent = isDisabled ? '+' : '-';
          statusButton.setAttribute('aria-label', isDisabled ? t('enableUser') : t('disableUser'));
          statusButton.title = isDisabled ? t('enableUser') : t('disableUser');
          statusButton.addEventListener('click', () => toggleUserStatus(user));
          actions.append(statusButton);
        }

        if (user.username !== 'admin' && user.id !== currentUser.id) {
          const deleteButton = document.createElement('button');
          deleteButton.type = 'button';
          deleteButton.className = 'task-action-icon danger';
          deleteButton.textContent = '×';
          deleteButton.setAttribute('aria-label', t('delete'));
          deleteButton.title = t('delete');
          deleteButton.addEventListener('click', () => confirmDeleteUser(user));
          actions.append(deleteButton);
        }

        actionsCell.append(actions);
        row.append(usernameCell, nameCell, emailCell, statusCell, taskCountCell, noteCountCell, actionsCell);
        userList.append(row);
      });
    };

    const formatAuditAction = (action) => {
      if (action === 'create') return t('created');
      if (action === 'edit') return t('updated');
      if (action === 'delete') return t('delete');
      if (action === 'login') return t('login');
      if (action === 'register') return t('signup');
      return action;
    };

    const formatAuditTarget = (log) => {
      const labels = {
        credit_card: t('creditCards'),
        expense: t('monthlyBills'),
        note: t('notes'),
        task: t('tasks'),
        transaction: t('transactionsSubTab'),
        user: t('manageUsers'),
      };
      const type = labels[log.entity_type] || log.entity_type;
      return `${type} #${log.entity_id || ''}`.trim();
    };

    const formatAuditDateTime = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';

      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      const time = date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });

      return `${month}/${day}/${year} ${time}`;
    };

    const renderAuditLogs = (logs = auditLogs) => {
      if (!auditLogList) return;
      auditLogList.innerHTML = '';

      if (!logs.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 7;
        cell.className = 'empty-table-cell';
        cell.textContent = t('auditNoEvents');
        row.append(cell);
        auditLogList.append(row);
        return;
      }

      logs.forEach((log) => {
        const row = document.createElement('tr');
        const actor = log.impersonator_username
          ? `${log.actor_username || ''} -> ${log.username || ''}`
          : (log.actor_username || log.username || '');
        const cells = [
          [t('time'), formatAuditDateTime(log.created_at)],
          [t('actor'), actor],
          [t('actions'), formatAuditAction(log.action)],
          [t('target'), formatAuditTarget(log)],
          [t('owner'), log.username || ''],
          [t('summary'), log.summary || ''],
          ['IP Address', log.ip_address || '-'],
        ];

        cells.forEach(([label, value]) => {
          const cell = document.createElement('td');
          cell.dataset.label = label;
          if (label === t('summary') && value) {
            cell.className = 'audit-log-summary-cell';
            cell.title = value;
          }
          cell.textContent = value;
          row.append(cell);
        });

        auditLogList.append(row);
      });
    };

    const clearAdminUserFormError = () => {
      adminUserFormError.textContent = '';
      adminUserFormError.classList.add('hidden');
    };

    const showAdminUserModal = (user = null) => {
      pendingAdminUser = user;
      clearAdminUserFormError();
      adminUserForm.reset();

      adminUserModalTitle.textContent = user ? t('editUser') : t('addUser');
      saveAdminUser.setAttribute('aria-label', user ? t('save') : t('addUser'));
      saveAdminUser.title = user ? t('save') : t('addUser');
      adminPasswordField.classList.toggle('hidden', Boolean(user));
      adminPasswordInput.required = !user;
      adminStatusInput.disabled = user?.username === 'admin';

      if (user) {
        adminNameInput.value = user.name || '';
        adminUsernameInput.value = user.username || '';
        adminEmailInput.value = user.email || '';
        adminStatusInput.value = user.account_status || 'enabled';
      } else {
        adminStatusInput.value = 'enabled';
      }

      adminUserModal.classList.remove('hidden');
      adminUsernameInput.focus();
      adminUsernameInput.select();
    };

    const hideAdminUserModal = () => {
      pendingAdminUser = null;
      adminUserForm.reset();
      adminPasswordField.classList.remove('hidden');
      adminPasswordInput.required = true;
      adminStatusInput.disabled = false;
      clearAdminUserFormError();
      adminUserModal.classList.add('hidden');
    };

    const handleAdminUserSubmit = async (event) => {
      event.preventDefault();
      adminMessage.textContent = '';
      clearAdminUserFormError();

      const username = adminUsernameInput.value.trim();
      const name = adminNameInput.value.trim();
      const email = adminEmailInput.value.trim();
      const accountStatus = adminStatusInput.value;
      const password = adminPasswordInput.value.trim();
      const isEditing = Boolean(pendingAdminUser);

      if (!username || (!isEditing && !password)) {
        adminUserFormError.textContent = t('authRequired');
        adminUserFormError.classList.remove('hidden');
        return;
      }

      if (/\s/.test(username)) {
        adminUserFormError.textContent = t('usernameNoSpaces');
        adminUserFormError.classList.remove('hidden');
        return;
      }

      const result = await request(isEditing ? `/api/admin/users/${pendingAdminUser.id}` : '/api/admin/users', {
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify(isEditing
          ? { username, name, email, account_status: accountStatus }
          : { username, name, email, password, account_status: accountStatus }),
      });

      if (result.error) {
        adminUserFormError.textContent = result.error;
        adminUserFormError.classList.remove('hidden');
        return;
      }

      hideAdminUserModal();
      showStatusToast(isEditing ? t('userUpdated') : t('userAdded'));
      loadUsers();
    };

    const clearResetPasswordError = () => {
      resetPasswordError.textContent = '';
      resetPasswordError.classList.add('hidden');
    };

    const showResetPasswordModal = (user) => {
      pendingResetPasswordUser = user;
      clearResetPasswordError();
      resetPasswordForm.reset();
      setText('#reset-password-title', t('newPasswordFor', { username: user.username }));
      resetPasswordModal.classList.remove('hidden');
      resetPasswordInput.focus();
    };

    const hideResetPasswordModal = () => {
      pendingResetPasswordUser = null;
      resetPasswordForm.reset();
      clearResetPasswordError();
      resetPasswordModal.classList.add('hidden');
    };

    const resetUserPassword = (user) => {
      showResetPasswordModal(user);
    };

    const submitResetPassword = async (user, password) => {
      if (!password.trim()) {
        resetPasswordError.textContent = t('passwordRequired');
        resetPasswordError.classList.remove('hidden');
        return;
      }

      const result = await request(`/api/admin/users/${user.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      });

      if (result.error) {
        resetPasswordError.textContent = result.error;
        resetPasswordError.classList.remove('hidden');
        return;
      }

      hideResetPasswordModal();
      showStatusToast(t('passwordUpdated'));
    };

    const startImpersonation = async (userId) => {
      const result = await request('/api/admin/impersonate', {
        method: 'POST',
        body: JSON.stringify({ user_id: Number(userId) }),
      });

      if (result.error) {
        adminMessage.textContent = result.error;
        if (impersonateUserSelect) impersonateUserSelect.value = '';
        return;
      }

      resetFinancialModules();
      setCurrentUser(result.user);
      applyUserPreferences(result.user);
      applyTranslations();
      identifyMonitoringUser();
      trackEvent('impersonation_started');
      disconnectRealtime();
      connectRealtime();
      setCurrentView('dashboard');
      showStatusToast(t('impersonationStarted', { username: result.user.username }));
      showSection();
    };

    const stopImpersonation = async () => {
      const result = await request('/api/impersonation/stop', { method: 'POST' });

      if (result.error) {
        alert(result.error);
        return;
      }

      resetFinancialModules();
      setCurrentUser(result.user);
      applyUserPreferences(result.user);
      applyTranslations();
      identifyMonitoringUser();
      trackEvent('impersonation_stopped');
      disconnectRealtime();
      connectRealtime();
      setCurrentView('admin');
      showStatusToast(t('impersonationStopped'));
      showSection();
    };

    const toggleUserStatus = async (user) => {
      const nextStatus = user.account_status === 'disabled' ? 'enabled' : 'disabled';
      const result = await request(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ account_status: nextStatus }),
      });

      if (result.error) {
        alert(result.error);
        return;
      }

      showStatusToast(nextStatus === 'disabled' ? t('userDisabled') : t('userEnabled'));
      loadUsers();
    };

    const deleteUser = async (user) => {
      const result = await request(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (result.error) {
        alert(result.error);
        return;
      }

      loadUsers();
    };

    // Admin-specific i18n. Called by the global applyTranslations().
    const applyAdminTranslations = () => {
      setText('#admin-section h2', t('manageUsers'));
      setText('#open-add-user-modal .admin-add-user-label', t('addUser'));
      if (impersonateUserSelect) {
        impersonateUserSelect.setAttribute('aria-label', t('impersonateUser'));
        const placeholder = impersonateUserSelect.querySelector('option[value=""]');
        if (placeholder) placeholder.textContent = t('impersonate');
      }
      adminUserModalTitle.textContent = pendingAdminUser ? t('editUser') : t('addUser');
      setText('label[for="admin-name"]', t('name'));
      setText('label[for="admin-username"]', t('username'));
      setText('label[for="admin-email"]', t('email'));
      setText('label[for="admin-status"]', t('userStatus'));
      const enabledOption = adminStatusInput?.querySelector('option[value="enabled"]');
      const disabledOption = adminStatusInput?.querySelector('option[value="disabled"]');
      if (enabledOption) enabledOption.textContent = t('userEnabledStatus');
      if (disabledOption) disabledOption.textContent = t('userDisabledStatus');
      setText('label[for="admin-password"]', t('password'));
      cancelAdminUser.setAttribute('aria-label', t('cancel'));
      cancelAdminUser.title = t('cancel');
      saveAdminUser.setAttribute('aria-label', pendingAdminUser ? t('save') : t('addUser'));
      saveAdminUser.title = pendingAdminUser ? t('save') : t('addUser');
      setText('.user-table th:nth-child(1)', t('username'));
      setText('.user-table th:nth-child(2)', t('name'));
      setText('.user-table th:nth-child(3)', t('email'));
      setText('.user-table th:nth-child(4)', t('userStatus'));
      setText('.user-table th:nth-child(5)', t('tasks'));
      setText('.user-table th:nth-child(6)', t('notes'));
      setText('.user-table th:nth-child(7)', t('actions'));
      setText('#audit-log-title', t('auditLog'));
      setText('label[for="audit-log-search-input"]', t('searchAuditLog'));
      if (auditLogSearchInput) auditLogSearchInput.placeholder = t('searchAuditLog');
      setText('#refresh-audit-log', t('refresh'));
      setText('#audit-log-previous', t('previousPage'));
      setText('#audit-log-next', t('nextPage'));
      setText('.audit-log-table th:nth-child(1)', t('time'));
      setText('.audit-log-table th:nth-child(2)', t('actor'));
      setText('.audit-log-table th:nth-child(3)', t('actions'));
      setText('.audit-log-table th:nth-child(4)', t('target'));
      setText('.audit-log-table th:nth-child(5)', t('owner'));
      setText('.audit-log-table th:nth-child(6)', t('summary'));
    };

    // Render admin views from current state (used after a language switch).
    const renderFromState = () => {
      renderUsers(users);
      renderAuditLogs(auditLogs);
    };

    const sendSummaryEmail = async () => {
      sendSummaryEmailButton.disabled = true;
      showStatusToast(t('sending'), 'success', { persist: true });

      try {
        const result = await request('/api/tasks/send-email', {
          method: 'POST',
          body: JSON.stringify({ language: currentLanguage }),
        });

        if (result.error) {
          showStatusToast(result.error, 'error');
          return;
        }

        showStatusToast(t('emailSent'));
      } catch (error) {
        showStatusToast(error.message || t('emailFailed'), 'error');
      } finally {
        sendSummaryEmailButton.disabled = false;
      }
    };

    const sendNotesEmail = async () => {
      sendNotesEmailButton.disabled = true;
      showStatusToast(t('sending'), 'success', { persist: true });

      try {
        const result = await request('/api/admin/notes/send-email', {
          method: 'POST',
          body: JSON.stringify({ language: currentLanguage }),
        });

        if (result.error) {
          showStatusToast(result.error, 'error');
          return;
        }

        showStatusToast(t('emailSent'));
      } catch (error) {
        showStatusToast(error.message || t('emailFailed'), 'error');
      } finally {
        sendNotesEmailButton.disabled = false;
      }
    };

    const bind = () => {
      adminUserForm.addEventListener('submit', handleAdminUserSubmit);
      openAddUserModalButton.addEventListener('click', () => showAdminUserModal());
      sendSummaryEmailButton?.addEventListener('click', sendSummaryEmail);
      sendNotesEmailButton?.addEventListener('click', sendNotesEmail);
      if (impersonateUserSelect) {
        impersonateUserSelect.addEventListener('change', (event) => {
          if (event.target.value) startImpersonation(event.target.value);
        });
      }
      refreshAuditLog?.addEventListener('click', () => loadAuditLogs(auditLogPage));
      auditLogSearchInput?.addEventListener('input', scheduleAuditLogSearch);
      auditLogPrevious?.addEventListener('click', () => {
        if (auditLogPage > 1) loadAuditLogs(auditLogPage - 1);
      });
      auditLogNext?.addEventListener('click', () => {
        if (auditLogNext && !auditLogNext.disabled) loadAuditLogs(auditLogPage + 1);
      });
      cancelAdminUser.addEventListener('click', hideAdminUserModal);
      resetPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!pendingResetPasswordUser) return;
        clearResetPasswordError();
        await submitResetPassword(pendingResetPasswordUser, resetPasswordInput.value);
      });
      cancelResetPassword.addEventListener('click', hideResetPasswordModal);
    };

    return {
      bind,
      loadUsers,
      loadAuditLogs,
      renderFromState,
      applyTranslations: applyAdminTranslations,
      showAdminUserModal,
      hideAdminUserModal,
      hideResetPasswordModal,
      stopImpersonation,
      deleteUser,
    };
  };

  window.AdminModule = { create };
}());
