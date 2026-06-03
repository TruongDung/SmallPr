// Authentication, user settings, theme, and translations module.
(function () {
  const create = (deps) => {
    const {
      state,
      request,
      t,
      U,
      showStatusToast,
      getActiveTimezone,
      isAdminUser,
      isImpersonating,
      renderUserArea_domRefs,
    } = deps;

    const {
      authSection, taskSection, adminSection, creditCardSection, notesSection,
      dashboardSection, userArea, floatingAddTask, taskSubtabNav,
      authForm, authEmailField, authEmailInput,
      authMessage, showLogin, showSignup, logoutButton, passwordInput,
      togglePasswordButton, themeToggle,
      taskSearchInput, clearTaskSearch, taskPriorityInput, taskStatusInput,
      taskTagInput, weatherCityInput, tagNameInput,
      editTagTitle, editTagNameInput, cancelEditTag,
      sendSummaryEmailButton, exportExcelButton, exportPdfButton, exportWordButton,
      userSettingsModal, userSettingsTitle, userSettingsForm,
      settingsNameInput, settingsEmailInput, settingsTimezoneInput,
      settingsLanguageInput, userSettingsFormError,
      cancelUserSettings, saveUserSettings,
      passwordSettingsTitle, passwordSettingsForm,
      settingsCurrentPasswordInput, settingsNewPasswordInput,
      passwordSettingsFormError, savePasswordSettings,
    } = renderUserArea_domRefs;

    const rememberMeCheckbox = document.getElementById('remember-me');
    const rememberMeText = document.getElementById('remember-me-text');

    // ---- Theme ----

    const applyTheme = () => {
      const isDark = state.currentTheme === 'dark';
      document.body.classList.toggle('theme-dark', isDark);
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      themeToggle.querySelector('.theme-toggle-text').textContent = isDark ? 'Light' : 'Dark';
    };

    const toggleTheme = () => {
      state.currentTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('task-manager-theme', state.currentTheme);
      applyTheme();
    };

    // ---- Password visibility ----

    const togglePasswordVisibility = () => {
      const isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      togglePasswordButton.setAttribute('aria-pressed', String(isHidden));
      togglePasswordButton.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    };

    // ---- Mode ----

    const setMode = (mode) => {
      state.currentMode = mode;
      showLogin.classList.toggle('active', mode === 'login');
      showSignup.classList.toggle('active', mode === 'signup');
      authEmailField?.classList.toggle('hidden', mode !== 'signup');
      if (authEmailInput) authEmailInput.required = mode === 'signup';
      passwordInput.setAttribute('autocomplete', mode === 'login' ? 'current-password' : 'new-password');
      if (mode === 'signup') {
        state.registrationStartedAt = Date.now();
        state.registrationInteractionCount = 0;
        authForm.username.value = '';
        if (authEmailInput) authEmailInput.value = '';
        authForm.password.value = '';
        if (authForm.website) authForm.website.value = '';
        if (rememberMeCheckbox) rememberMeCheckbox.checked = false;
        authMessage.textContent = '';
      }
    };

    // ---- i18n ----

    const setText = (selector, value) => {
      const element = document.querySelector(selector);
      if (element) element.textContent = value;
    };

    const setIconButtonLabel = (button, label) => {
      button.setAttribute('aria-label', label);
      button.title = label;
    };

    const updatePriorityOptions = (select) => {
      if (!select) return;
      select.querySelector('option[value="low"]').textContent = t('low');
      select.querySelector('option[value="medium"]').textContent = t('medium');
      select.querySelector('option[value="high"]').textContent = t('high');
    };

    const updateStatusOptions = (select) => {
      if (!select) return;
      select.querySelector('option[value="todo"]').textContent = t('todo');
      select.querySelector('option[value="in_progress"]').textContent = t('in_progress');
      select.querySelector('option[value="done"]').textContent = t('done');
    };

    const setNavButtonContent = (button, label, icon) => {
      button.textContent = '';
      const iconSpan = document.createElement('span');
      iconSpan.className = 'nav-icon';
      iconSpan.setAttribute('aria-hidden', 'true');
      iconSpan.textContent = icon;
      const labelSpan = document.createElement('span');
      labelSpan.className = 'nav-label';
      labelSpan.textContent = label;
      button.append(iconSpan, labelSpan);
      button.setAttribute('aria-label', label);
      button.title = label;
    };

    const applyTranslations = () => {
      document.documentElement.lang = state.currentLanguage;
      document.title = t('appTitle');
      setText('h1', t('appTitle'));
      setText('.app-subtitle', t('appSubtitle'));
      applyTheme();
      showLogin.textContent = t('login');
      showSignup.textContent = t('signup');
      if (rememberMeText) rememberMeText.textContent = t('rememberMe');
      setText('label[for="username"]', t('username'));
      setText('label[for="auth-email"]', t('email'));
      setText('label[for="password"]', t('password'));
      togglePasswordButton.setAttribute(
        'aria-label',
        passwordInput.type === 'password' ? t('showPassword') : t('hidePassword')
      );
      setText('#auth-form button[type="submit"]', t('submit'));
      setIconButtonLabel(sendSummaryEmailButton, t('sendEmail'));
      setIconButtonLabel(exportExcelButton, t('exportExcel'));
      setIconButtonLabel(exportPdfButton, t('exportPdf'));
      if (exportWordButton) setIconButtonLabel(exportWordButton, t('exportWord'));
      logoutButton.textContent = t('logout');
      if (userSettingsTitle) userSettingsTitle.textContent = t('userSettings');
      if (passwordSettingsTitle) passwordSettingsTitle.textContent = t('changePassword');
      setText('label[for="settings-name"]', t('name'));
      setText('label[for="settings-email"]', t('email'));
      setText('label[for="settings-timezone"]', t('timezone'));
      setText('label[for="settings-language"]', t('language'));
      setText('label[for="settings-current-password"]', t('currentPassword'));
      setText('label[for="settings-new-password"]', t('newPassword'));
      cancelUserSettings?.setAttribute('aria-label', t('cancel'));
      if (cancelUserSettings) cancelUserSettings.title = t('cancel');
      saveUserSettings?.setAttribute('aria-label', t('save'));
      if (saveUserSettings) saveUserSettings.title = t('save');
      savePasswordSettings?.setAttribute('aria-label', t('save'));
      if (savePasswordSettings) savePasswordSettings.title = t('save');
      setText('#weather-title', t('weather'));
      weatherCityInput.placeholder = t('cityPlaceholder');
      setText('#weather-form button[type="submit"]', t('addCity'));
      setText('label[for="task-search-input"]', t('searchTasks'));
      taskSearchInput.placeholder = t('searchTasksPlaceholder');
      clearTaskSearch.setAttribute('aria-label', t('clearSearch'));
      clearTaskSearch.title = t('clearSearch');
      setText('label[for="task-title"]', `${t('title')} ${t('max20')}`);
      setText('label[for="task-priority"]', t('priority'));
      updatePriorityOptions(taskPriorityInput);
      setText('label[for="task-status"]', t('status'));
      updateStatusOptions(taskStatusInput);
      setText('label[for="task-tag"]', t('tag'));
      taskTagInput.placeholder = t('tagPlaceholder');
      setText('#tag-manager-title', t('manageTags'));
      setText('#tasks-subtab', t('tasks'));
      setText('#archived-subtab', t('archive'));
      setText('#tag-subtab', t('tag'));
      setText('label[for="tag-name"]', t('tagName'));
      if (tagNameInput) tagNameInput.placeholder = t('tagPlaceholder');
      setText('#tag-form button[type="submit"]', t('addTag'));
      if (editTagTitle) editTagTitle.textContent = t('renameTag');
      setText('label[for="edit-tag-name-input"]', t('tagName'));
      if (editTagNameInput) editTagNameInput.placeholder = t('tagPlaceholder');
      if (cancelEditTag) {
        cancelEditTag.className = 'task-action-icon secondary';
        cancelEditTag.textContent = '×';
        cancelEditTag.setAttribute('aria-label', t('cancel'));
        cancelEditTag.title = t('cancel');
      }
    };

    // ---- User preferences ----

    const applyUserPreferences = (user) => {
      state.currentTimezone = user?.timezone || null;
      if (user?.language && deps.translations[user.language]) {
        state.currentLanguage = user.language;
        localStorage.setItem('task-manager-language', user.language);
      }
    };

    const setSettingsError = (element, text) => {
      if (!element) return;
      element.textContent = text || '';
      element.classList.toggle('hidden', !text);
    };

    const showUserSettingsModal = () => {
      if (!state.currentUser || !userSettingsModal) return;
      setSettingsError(userSettingsFormError, '');
      setSettingsError(passwordSettingsFormError, '');
      userSettingsForm?.reset();
      passwordSettingsForm?.reset();
      settingsNameInput.value = state.currentUser.name || '';
      settingsEmailInput.value = state.currentUser.email || '';
      settingsTimezoneInput.value = getActiveTimezone();
      settingsLanguageInput.value = state.currentUser.language || state.currentLanguage;
      userSettingsModal.classList.remove('hidden');
      settingsNameInput.focus();
    };

    const hideUserSettingsModal = () => {
      userSettingsForm?.reset();
      passwordSettingsForm?.reset();
      setSettingsError(userSettingsFormError, '');
      setSettingsError(passwordSettingsFormError, '');
      userSettingsModal?.classList.add('hidden');
    };

    const handleUserSettingsSubmit = async (event) => {
      event.preventDefault();
      setSettingsError(userSettingsFormError, '');
      const result = await request('/api/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: settingsNameInput.value.trim(),
          email: settingsEmailInput.value.trim(),
          timezone: settingsTimezoneInput.value.trim(),
          language: settingsLanguageInput.value,
        }),
      });
      if (result.error) {
        setSettingsError(userSettingsFormError, result.error);
        return;
      }
      state.currentUser = result.user;
      applyUserPreferences(state.currentUser);
      applyTranslations();
      window.AppMonitoring?.setUser?.(state.currentUser);
      window.AppMonitoring?.captureEvent?.('settings_saved', {
        has_timezone: Boolean(state.currentUser.timezone),
        language: state.currentUser.language || state.currentLanguage,
      });
      deps.renderUserArea();
      window.dashboardModule?.refresh?.();
      showStatusToast(t('settingsSaved'));
    };

    const handlePasswordSettingsSubmit = async (event) => {
      event.preventDefault();
      setSettingsError(passwordSettingsFormError, '');
      const currentPassword = settingsCurrentPasswordInput.value;
      const newPassword = settingsNewPasswordInput.value;
      if (!currentPassword || !newPassword) {
        setSettingsError(passwordSettingsFormError, t('passwordRequired'));
        return;
      }
      const result = await request('/api/me/password', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      if (result.error) {
        setSettingsError(passwordSettingsFormError, result.error);
        return;
      }
      passwordSettingsForm.reset();
      window.AppMonitoring?.captureEvent?.('password_changed');
      showStatusToast(t('passwordUpdated'));
    };

    // ---- Pre-fill remembered credentials ----

    const prefillRememberedCredentials = () => {
      try {
        const saved = localStorage.getItem(state.REMEMBER_ME_KEY);
        if (!saved) return;
        const { username, password } = JSON.parse(saved) || {};
        if (typeof username === 'string') authForm.username.value = username;
        if (typeof password === 'string') authForm.password.value = password;
        if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
      } catch (error) {
        console.warn('Failed to load remembered credentials', error);
      }
    };

    // ---- Auth submit ----

    const markRegistrationInteraction = () => {
      if (state.currentMode !== 'signup') return;
      state.registrationInteractionCount += 1;
    };

    const handleAuthSubmit = async (event) => {
      event.preventDefault();
      const username = authForm.username.value.trim();
      const password = authForm.password.value;
      const email = authEmailInput?.value.trim() || '';

      if (!username || !password) {
        authMessage.textContent = t('authRequired');
        return;
      }

      if (state.currentMode === 'signup') {
        if (!email || !email.includes('@')) {
          authMessage.textContent = t('emailRequired');
          return;
        }
        const elapsed = Date.now() - state.registrationStartedAt;
        const interactions = state.registrationInteractionCount;
        if (authForm.website && authForm.website.value.trim()) {
          return;
        }
        const result = await request('/api/register', {
          method: 'POST',
          body: JSON.stringify({ username, email, password, _elapsed_ms: elapsed, _interactions: interactions }),
        });
        if (result.error) {
          authMessage.textContent = result.error;
          return;
        }
        authMessage.textContent = t('verificationEmailSent');
        window.AppMonitoring?.captureEvent?.('register', { elapsed_ms: elapsed, interactions });
        return;
      }

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        });
        const result = await response.json();
        if (result.error) {
          authMessage.textContent = result.error;
          return;
        }
        state.currentUser = result.user;
        applyUserPreferences(result.user);
        if (rememberMeCheckbox?.checked) {
          localStorage.setItem(state.REMEMBER_ME_KEY, JSON.stringify({ username, password }));
        } else {
          localStorage.removeItem(state.REMEMBER_ME_KEY);
        }
        window.AppMonitoring?.setUser?.(state.currentUser);
        window.AppMonitoring?.captureEvent?.('login');
        applyTranslations();
        deps.showSection();
        deps.connectRealtime();
      } catch (error) {
        authMessage.textContent = error.message || 'Login failed';
      }
    };

    // ---- Logout ----

    const handleLogout = async () => {
      await request('/api/logout', { method: 'POST' });
      deps.resetFinancialModules();
      state.currentUser = null;
      state.currentTimezone = null;
      window.AppMonitoring?.setUser?.(null);
      window.AppMonitoring?.captureEvent?.('logout');
      deps.disconnectRealtime();
      window.AppState.setCurrentView('tasks', { persist: false });
      deps.showSection();
      prefillRememberedCredentials();
    };

    return {
      applyTheme,
      toggleTheme,
      togglePasswordVisibility,
      setMode,
      applyTranslations,
      applyUserPreferences,
      showUserSettingsModal,
      hideUserSettingsModal,
      handleUserSettingsSubmit,
      handlePasswordSettingsSubmit,
      prefillRememberedCredentials,
      handleAuthSubmit,
      handleLogout,
      markRegistrationInteraction,
    };
  };

  window.AuthModule = { create };
})();
