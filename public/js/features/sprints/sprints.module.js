(function () {
  const create = ({
    request,
    t,
    showStatusToast,
    confirmDelete = null,
    onSprintsChanged = () => {},
    getCurrentUser = () => null,
    onOpenTask = () => {},
  }) => {
    const sprintsList = document.getElementById('sprints-list');
    const openAddButton = document.getElementById('open-add-sprint');
    const modal = document.getElementById('sprint-modal');
    const modalTitle = document.getElementById('sprint-modal-title');
    const form = document.getElementById('sprint-form');
    const nameInput = document.getElementById('sprint-name-input');
    const goalInput = document.getElementById('sprint-goal-input');
    const startInput = document.getElementById('sprint-start-input');
    const endInput = document.getElementById('sprint-end-input');
    const statusInput = document.getElementById('sprint-status-input');
    const editorField = document.getElementById('sprint-editor-field');
    const editorInput = document.getElementById('sprint-editor-input');
    const editorSummary = document.getElementById('sprint-editor-summary');
    const editorOptions = document.getElementById('sprint-editor-options');
    const editorHint = document.getElementById('sprint-editor-hint');
    const formError = document.getElementById('sprint-form-error');
    const cancelButton = document.getElementById('cancel-sprint');
    const saveButton = document.getElementById('save-sprint');

    let sprints = [];
    let sprintTasks = [];
    let assignableEditors = [];
    let selectedEditorIds = [];
    let isLoadingEditors = false;
    let editingId = null;

    const statusLabels = {
      planned: () => t('sprint_planned') || 'Planned',
      active: () => t('sprint_active') || 'Active',
      completed: () => t('sprint_completed') || 'Completed',
    };

    const loadSprints = async ({ archived = false, renderView = true } = {}) => {
      // Immediately hide/show the "+" button to avoid a flash while loading.
      const sprintsHeader = document.querySelector('.sprints-header');
      if (sprintsHeader) sprintsHeader.classList.toggle('hidden', archived);
      if (openAddButton) openAddButton.classList.toggle('hidden', archived);
      const archivedHeading = document.getElementById('sprints-archived-heading');
      if (archivedHeading) archivedHeading.classList.toggle('hidden', !archived);

      const [sprintsResult, tasksResult] = await Promise.all([
        request(`/api/sprints${archived ? '?archived=true' : ''}`),
        request('/api/tasks'),
      ]);

      if (sprintsResult.error) {
        showStatusToast(sprintsResult.error, 'error');
        return;
      }

      if (tasksResult.error) {
        showStatusToast(tasksResult.error, 'error');
        return;
      }

      sprints = sprintsResult.sprints || [];
      sprintTasks = tasksResult.tasks || [];
      if (renderView) {
        render({ archived });
      }
      return { sprints, sprintTasks };
    };

    const normalizeSprintId = (value) => (value === null || value === undefined || value === ''
      ? null
      : Number(value));

    const isAdminUser = () => getCurrentUser()?.username === 'admin';
    const canDeleteSprint = (sprint) => Number(sprint.is_owner) === 1 || isAdminUser();
    const canRemoveTaskFromSprint = (task) => {
      const currentUserId = Number(getCurrentUser()?.id);
      return Number(task.user_id) === currentUserId || Number(task.sprint_owner_user_id) === currentUserId;
    };

    const getTasksForSprint = (sprintId) => sprintTasks.filter((task) => (
      normalizeSprintId(task.sprint_id) === normalizeSprintId(sprintId)
    ));

    const normalizeEditorIds = (value) => {
      if (Array.isArray(value)) {
        return value
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0);
      }
      const id = Number(value);
      return Number.isInteger(id) && id > 0 ? [id] : [];
    };

    const getSprintEditorIds = (sprint) => {
      const ids = normalizeEditorIds(sprint.editor_user_ids);
      return ids.length ? ids : normalizeEditorIds(sprint.editor_user_id);
    };

    const getSprintEditors = (sprint) => {
      if (Array.isArray(sprint.editors) && sprint.editors.length) {
        return sprint.editors;
      }
      if (sprint.editor_user_id && (sprint.editor_name || sprint.editor_username)) {
        return [{
          id: sprint.editor_user_id,
          name: sprint.editor_name,
          username: sprint.editor_username,
        }];
      }
      return [];
    };

    const formatUserName = (user) => user.name || user.username || '';

    const formatEditorNames = (editors) => editors
      .map(formatUserName)
      .filter(Boolean)
      .join(', ');

    const getSelectedEditorIds = () => {
      if (!editorInput) return [];
      return [...selectedEditorIds];
    };

    const syncEditorInput = () => {
      if (!editorInput) return;
      const selectedIds = new Set(selectedEditorIds.map(String));
      editorInput.innerHTML = '';

      if (!assignableEditors.length) {
        return;
      }

      assignableEditors.forEach((user) => {
        const option = document.createElement('option');
        option.value = String(user.id);
        option.textContent = user.name ? `${user.name} (${user.username})` : user.username;
        option.selected = selectedIds.has(String(user.id));
        editorInput.append(option);
      });
    };

    const renderEditorSummary = () => {
      if (!editorSummary) return;
      editorSummary.innerHTML = '';

      if (!selectedEditorIds.length) {
        const empty = document.createElement('span');
        empty.className = 'sprint-editor-empty';
        empty.textContent = t('sprintEditorPlaceholder') || 'No editors selected';
        editorSummary.append(empty);
        return;
      }

      const selectedUsers = assignableEditors.filter((user) => selectedEditorIds.includes(Number(user.id)));
      selectedUsers.forEach((user) => {
        const chip = document.createElement('span');
        chip.className = 'sprint-editor-chip';
        chip.textContent = formatUserName(user);
        editorSummary.append(chip);
      });

      const count = document.createElement('span');
      count.className = 'sprint-editor-count';
      count.textContent = t('sprintEditorsSelected', { count: selectedEditorIds.length }) || `${selectedEditorIds.length} selected`;
      editorSummary.append(count);
    };

    const toggleEditorSelection = (userId) => {
      const id = Number(userId);
      if (!Number.isInteger(id) || id <= 0) return;
      selectedEditorIds = selectedEditorIds.includes(id)
        ? selectedEditorIds.filter((selectedId) => selectedId !== id)
        : [...selectedEditorIds, id];
      setEditorOptions(selectedEditorIds);
    };

    const renderEditorOptions = () => {
      if (!editorOptions) return;
      editorOptions.innerHTML = '';

      if (!assignableEditors.length) {
        const empty = document.createElement('p');
        empty.className = 'sprint-editor-options-empty';
        empty.textContent = isLoadingEditors
          ? (t('sprintEditorsLoading') || 'Loading editors...')
          : (t('sprintNoEditorsAvailable') || 'No eligible users');
        editorOptions.append(empty);
        return;
      }

      assignableEditors.forEach((user) => {
        const isSelected = selectedEditorIds.includes(Number(user.id));
        const displayName = formatUserName(user);
        const option = document.createElement('button');
        option.type = 'button';
        option.className = `sprint-editor-option${isSelected ? ' is-selected' : ''}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(isSelected));
        option.setAttribute('aria-label', t('sprintEditorToggle', { username: displayName }) || `Toggle ${displayName}`);
        option.addEventListener('click', () => toggleEditorSelection(user.id));

        const text = document.createElement('span');
        text.className = 'sprint-editor-option-text';
        const name = document.createElement('strong');
        name.textContent = displayName;
        text.append(name);
        if (user.name && user.username) {
          const username = document.createElement('small');
          username.textContent = user.username;
          text.append(username);
        }

        const check = document.createElement('span');
        check.className = 'sprint-editor-option-check';
        check.textContent = isSelected ? '✓' : '';
        option.append(text, check);
        editorOptions.append(option);
      });
    };

    const setEditorOptions = (selectedValues = selectedEditorIds) => {
      if (!editorInput) return;
      const normalizedIds = [...new Set(normalizeEditorIds(selectedValues))];
      if (assignableEditors.length) {
        const assignableIds = new Set(assignableEditors.map((user) => Number(user.id)));
        selectedEditorIds = normalizedIds.filter((id) => assignableIds.has(id));
      } else {
        selectedEditorIds = normalizedIds;
      }
      syncEditorInput();
      renderEditorSummary();
      renderEditorOptions();
    };

    const loadAssignableEditors = async (selectedValues = getSelectedEditorIds()) => {
      if (!isAdminUser() || !editorInput) return;
      isLoadingEditors = true;
      setEditorOptions(selectedValues);
      const result = await request('/api/admin/users');
      isLoadingEditors = false;
      if (result.error) {
        setEditorOptions(selectedValues);
        showStatusToast(result.error, 'error');
        return;
      }
      assignableEditors = (result.users || []).filter((user) => (
        user.username !== 'admin' && user.account_status === 'enabled'
      ));
      setEditorOptions(selectedValues);
    };

    const formatDateRange = (startDate, endDate) => {
      if (!startDate && !endDate) return t('noDate') || 'No dates';
      return `${startDate || '...'} -> ${endDate || '...'}`;
    };

    const getSprintProgress = (tasks) => {
      const total = tasks.length;
      const completed = tasks.filter((task) => task.status === 'done' || task.completed).length;
      return {
        total,
        completed,
        percent: total ? Math.round((completed / total) * 100) : 0,
      };
    };

    const clearDropTargets = () => {
      document.querySelectorAll('.sprint-drop-over').forEach((element) => {
        element.classList.remove('sprint-drop-over');
      });
    };

    const assignTaskToSprint = async (taskId, sprintId) => {
      const task = sprintTasks.find((item) => String(item.id) === String(taskId));
      const normalizedSprintId = normalizeSprintId(sprintId);
      if (!task || normalizeSprintId(task.sprint_id) === normalizedSprintId) return;

      const result = await request(`/api/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({ sprint_id: normalizedSprintId }),
      });

      if (result.error) {
        showStatusToast(result.error, 'error');
        return;
      }

      showStatusToast(
        normalizedSprintId === null
          ? (t('taskRemovedFromSprint') || 'Task moved to backlog.')
          : (t('taskAssignedToSprint') || 'Task added to sprint.')
      );
      await loadSprints();
    };

    const bindDropTarget = (target, sprintId) => {
      target.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      });
      target.addEventListener('dragenter', (event) => {
        event.preventDefault();
        target.classList.add('sprint-drop-over');
      });
      target.addEventListener('dragleave', (event) => {
        if (!target.contains(event.relatedTarget)) {
          target.classList.remove('sprint-drop-over');
        }
      });
      target.addEventListener('drop', async (event) => {
        event.preventDefault();
        target.classList.remove('sprint-drop-over');
        const taskId = event.dataTransfer.getData('text/plain');
        await assignTaskToSprint(taskId, sprintId);
      });
    };

    const createTaskPill = (task, { removable = false } = {}) => {
      const pill = document.createElement('div');
      pill.className = `sprint-task-pill sprint-task-pill-${task.priority || 'low'}`;
      pill.draggable = true;
      pill.dataset.taskId = task.id;
      pill.addEventListener('dragstart', (event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', task.id);
        pill.classList.add('sprint-task-pill-dragging');
      });
      pill.addEventListener('dragend', () => {
        pill.classList.remove('sprint-task-pill-dragging');
        clearDropTargets();
      });

      const copy = document.createElement('div');
      copy.className = 'sprint-task-copy';
      const title = document.createElement('button');
      title.type = 'button';
      title.className = 'sprint-task-title-button';
      title.draggable = false;
      title.textContent = task.title;
      title.addEventListener('click', (event) => {
        event.stopPropagation();
        onOpenTask(task);
      });
      const meta = document.createElement('span');
      meta.textContent = t(task.status || 'todo') || task.status || 'Todo';
      copy.append(title, meta);
      pill.append(copy);

      const isRemovable = typeof removable === 'function' ? removable(task) : Boolean(removable);
      if (isRemovable) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'sprint-task-remove';
        removeButton.textContent = '×';
        removeButton.title = t('removeFromSprint') || 'Remove from sprint';
        removeButton.setAttribute('aria-label', t('removeFromSprint') || 'Remove from sprint');
        removeButton.addEventListener('click', () => assignTaskToSprint(task.id, null));
        pill.append(removeButton);
      }

      return pill;
    };

    const createTaskList = (listTasks, emptyText, options = {}) => {
      const list = document.createElement('div');
      list.className = 'sprint-card-task-list';
      if (!listTasks.length) {
        const empty = document.createElement('p');
        empty.className = 'sprint-card-task-empty';
        empty.textContent = emptyText;
        list.append(empty);
        return list;
      }

      listTasks.forEach((task) => list.append(createTaskPill(task, options)));
      return list;
    };

    const createBacklog = () => {
      const backlog = document.createElement('aside');
      backlog.className = 'sprint-backlog sprint-drop-zone';
      bindDropTarget(backlog, null);

      const heading = document.createElement('div');
      heading.className = 'sprint-backlog-header';
      const title = document.createElement('h3');
      title.textContent = t('sprintBacklog') || 'No sprint';
      const count = document.createElement('span');
      const backlogTasks = getTasksForSprint(null);
      count.textContent = backlogTasks.length;
      heading.append(title, count);
      if (!backlogTasks.length) backlog.classList.add('sprint-backlog-empty');

      const hint = document.createElement('p');
      hint.className = 'sprint-backlog-hint';
      hint.textContent = t('dragTasksToSprint') || 'Drag tasks into a sprint.';

      backlog.append(
        heading,
        hint,
        createTaskList(backlogTasks, t('noBacklogTasks') || 'No unassigned tasks.')
      );

      return backlog;
    };

    const updateSprintArchive = async (sprint, archived) => {
      const result = await request(`/api/sprints/${sprint.id}`, {
        method: 'PUT',
        body: JSON.stringify({ archived }),
      });
      if (result.error) {
        showStatusToast(result.error, 'error');
        return;
      }
      showStatusToast(archived
        ? (t('sprintArchived') || 'Sprint archived.')
        : (t('sprintRestored') || 'Sprint restored.'));
      onSprintsChanged();
      await loadSprints({ archived: !archived });
    };

    const createSprintCard = (sprint, { archivedView = false } = {}) => {
      const card = document.createElement('div');
      card.className = `sprint-card sprint-card-${sprint.status} sprint-drop-zone`;
      if (!archivedView) {
        bindDropTarget(card, sprint.id);
      }

      const header = document.createElement('div');
      header.className = 'sprint-card-header';

      const name = document.createElement('h3');
      name.className = 'sprint-card-name';
      name.textContent = sprint.name;

      const badge = document.createElement('span');
      badge.className = `sprint-status-badge sprint-status-${sprint.status}`;
      badge.textContent = (statusLabels[sprint.status] || statusLabels.planned)();

      const titleWrap = document.createElement('div');
      titleWrap.className = 'sprint-card-title-wrap';
      titleWrap.append(name, badge);

      const actions = document.createElement('div');
      actions.className = 'sprint-card-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'task-action-icon secondary';
      editBtn.textContent = '✎';
      editBtn.title = t('editSprint') || 'Edit Sprint';
      editBtn.setAttribute('aria-label', t('editSprint') || 'Edit Sprint');
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(sprint);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'task-action-icon danger';
      deleteBtn.textContent = '×';
      deleteBtn.title = t('deleteSprint') || 'Delete Sprint';
      deleteBtn.setAttribute('aria-label', t('deleteSprint') || 'Delete Sprint');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof confirmDelete === 'function') {
          confirmDelete(sprint);
          return;
        }
        if (confirm(`${t('deleteSprint') || 'Delete Sprint'}: "${sprint.name}"?`)) {
          deleteSprint(sprint);
        }
      });

      const archiveBtn = document.createElement('button');
      archiveBtn.type = 'button';
      archiveBtn.className = 'task-action-icon secondary';
      archiveBtn.textContent = archivedView ? '↥' : '▣';
      archiveBtn.title = archivedView
        ? (t('restoreSprint') || t('restore') || 'Restore')
        : (t('archiveSprint') || t('archive') || 'Archive');
      archiveBtn.setAttribute('aria-label', archiveBtn.title);
      archiveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateSprintArchive(sprint, !archivedView);
      });

      actions.append(editBtn);
      if (canDeleteSprint(sprint)) {
        actions.append(archiveBtn, deleteBtn);
      }
      header.append(titleWrap, actions);
      card.append(header);

      const people = document.createElement('div');
      people.className = 'sprint-card-people';
      if (!canDeleteSprint(sprint) && (sprint.owner_name || sprint.owner_username)) {
        const owner = document.createElement('span');
        owner.textContent = t('sprintOwnedBy', { username: sprint.owner_name || sprint.owner_username }) || `Owner: ${sprint.owner_name || sprint.owner_username}`;
        people.append(owner);
      }
      const editors = getSprintEditors(sprint);
      const editorNames = formatEditorNames(editors);
      if (canDeleteSprint(sprint) && editorNames) {
        const editor = document.createElement('span');
        editor.textContent = t('sprintSharedWith', { username: editorNames }) || `Shared with ${editorNames}`;
        people.append(editor);
      }
      if (people.children.length) {
        card.append(people);
      }

      if (sprint.goal) {
        const goal = document.createElement('p');
        goal.className = 'sprint-card-goal';
        goal.textContent = sprint.goal;
        card.append(goal);
      }

      const meta = document.createElement('div');
      meta.className = 'sprint-card-meta';

      const sprintCardTasks = getTasksForSprint(sprint.id);
      const progress = getSprintProgress(sprintCardTasks);
      const dates = document.createElement('span');
      dates.className = 'sprint-card-dates';
      dates.textContent = formatDateRange(sprint.start_date, sprint.end_date);
      meta.append(dates);

      const taskCount = document.createElement('span');
      taskCount.className = 'sprint-card-tasks';
      taskCount.textContent = `${sprintCardTasks.length} ${t('sprintTasks') || 'tasks'}`;
      meta.append(taskCount);

      const progressWrap = document.createElement('div');
      progressWrap.className = 'sprint-progress';
      const progressLabel = document.createElement('span');
      progressLabel.textContent = `${progress.completed}/${progress.total} ${t('sprintCompleted') || 'completed'}`;
      const progressPercent = document.createElement('span');
      progressPercent.textContent = `${progress.percent}%`;
      const progressMeta = document.createElement('div');
      progressMeta.className = 'sprint-progress-meta';
      progressMeta.append(progressLabel, progressPercent);
      const progressTrack = document.createElement('div');
      progressTrack.className = 'sprint-progress-track';
      const progressFill = document.createElement('span');
      progressFill.style.width = `${progress.percent}%`;
      progressTrack.append(progressFill);
      progressWrap.append(progressMeta, progressTrack);

      card.append(
        meta,
        progressWrap,
        createTaskList(sprintCardTasks, t('noSprintTasks') || 'Drop tasks here.', { removable: archivedView ? false : canRemoveTaskFromSprint })
      );

      return card;
    };

    const render = ({ archived = false } = {}) => {
      if (!sprintsList) return;
      sprintsList.innerHTML = '';

      // Show/hide the static archived heading in the HTML
      const archivedHeading = document.getElementById('sprints-archived-heading');
      const sprintsHeader = document.querySelector('.sprints-header');
      if (archivedHeading) archivedHeading.classList.toggle('hidden', !archived);
      if (sprintsHeader) sprintsHeader.classList.toggle('hidden', archived);

      const title = document.getElementById('sprints-title');
      if (title) {
        title.textContent = t('sprints') || 'Sprints';
      }
      if (openAddButton) {
        openAddButton.classList.toggle('hidden', archived);
      }

      if (archived) {
        const sprintGrid = document.createElement('div');
        sprintGrid.className = 'sprint-cards sprint-cards-archived';
        if (!sprints.length) {
          const empty = document.createElement('p');
          empty.className = 'sprints-empty';
          empty.textContent = t('noArchivedSprints') || 'No archived sprints.';
          sprintGrid.append(empty);
        } else {
          sprints.forEach((sprint) => sprintGrid.append(createSprintCard(sprint, { archivedView: true })));
        }
        sprintsList.append(sprintGrid);
        return;
      }

      const layout = document.createElement('div');
      layout.className = 'sprint-planning-layout';
      layout.append(createBacklog());

      const sprintGrid = document.createElement('div');
      sprintGrid.className = 'sprint-cards';

      const totalTasks = sprintTasks.filter((task) => !task.archived).length;
      const assignedTasks = sprintTasks.filter((task) => normalizeSprintId(task.sprint_id) !== null && !task.archived).length;
      const summary = document.createElement('div');
      summary.className = 'sprint-summary';
      [
        [t('sprints') || 'Sprints', sprints.length],
        [t('sprintTasks') || 'Tasks', totalTasks],
        [t('sprintAssigned') || 'assigned', assignedTasks],
      ].forEach(([label, value]) => {
        const item = document.createElement('div');
        item.className = 'sprint-summary-item';
        const strong = document.createElement('strong');
        strong.textContent = value;
        const span = document.createElement('span');
        span.textContent = label;
        item.append(strong, span);
        summary.append(item);
      });

      if (!sprints.length) {
        const empty = document.createElement('p');
        empty.className = 'sprints-empty';
        empty.textContent = t('noSprints') || 'No sprints yet. Create your first sprint!';
        sprintGrid.append(empty);
      } else {
        sprints.forEach((sprint) => sprintGrid.append(createSprintCard(sprint)));
      }

      layout.append(sprintGrid);
      sprintsList.append(summary);
      sprintsList.append(layout);
    };

    const openAddModal = () => {
      editingId = null;
      modalTitle.textContent = t('newSprint') || 'New Sprint';
      form.reset();
      if (editorField) editorField.classList.toggle('hidden', !isAdminUser());
      if (editorInput) {
        setEditorOptions([]);
        loadAssignableEditors([]);
      }
      formError.classList.add('hidden');
      formError.textContent = '';
      modal.classList.remove('hidden');
      nameInput.focus();
    };

    const openEditModal = (sprint) => {
      editingId = sprint.id;
      modalTitle.textContent = t('editSprint') || 'Edit Sprint';
      nameInput.value = sprint.name || '';
      goalInput.value = sprint.goal || '';
      startInput.value = sprint.start_date || '';
      endInput.value = sprint.end_date || '';
      statusInput.value = sprint.status || 'planned';
      if (editorField) editorField.classList.toggle('hidden', !isAdminUser());
      if (editorInput) {
        const editorIds = getSprintEditorIds(sprint);
        setEditorOptions(editorIds);
        loadAssignableEditors(editorIds);
      }
      formError.classList.add('hidden');
      formError.textContent = '';
      modal.classList.remove('hidden');
      nameInput.focus();
    };

    const closeModal = () => {
      modal.classList.add('hidden');
      editingId = null;
      form.reset();
    };

    const setOptionText = (value, label) => {
      const option = statusInput?.querySelector(`option[value="${value}"]`);
      if (option) option.textContent = label;
    };

    const applyTranslations = () => {
      const title = document.getElementById('sprints-title');
      if (title) title.textContent = t('sprints') || 'Sprints';
      if (openAddButton) {
        openAddButton.setAttribute('aria-label', t('newSprint') || 'New Sprint');
        openAddButton.title = t('newSprint') || 'New Sprint';
      }
      if (modalTitle) {
        modalTitle.textContent = editingId ? (t('editSprint') || 'Edit Sprint') : (t('newSprint') || 'New Sprint');
      }

      const nameLabel = document.querySelector('label[for="sprint-name-input"]');
      if (nameLabel) nameLabel.textContent = t('sprintName') || 'Sprint Name';
      if (nameInput) nameInput.placeholder = t('sprintNamePlaceholder') || 'Sprint 1';
      const goalLabel = document.querySelector('label[for="sprint-goal-input"]');
      if (goalLabel) goalLabel.textContent = t('sprintGoal') || 'Sprint Goal';
      if (goalInput) goalInput.placeholder = t('sprintGoalPlaceholder') || "What's the goal of this sprint?";
      const startLabel = document.querySelector('label[for="sprint-start-input"]');
      if (startLabel) startLabel.textContent = t('sprintStart') || 'Start Date';
      const endLabel = document.querySelector('label[for="sprint-end-input"]');
      if (endLabel) endLabel.textContent = t('sprintEnd') || 'End Date';
      const statusLabel = document.querySelector('label[for="sprint-status-input"]');
      if (statusLabel) statusLabel.textContent = t('sprintStatus') || 'Status';
      const editorLabel = document.querySelector('label[for="sprint-editor-input"]');
      if (editorLabel) editorLabel.textContent = t('sprintEditors') || 'Editors';
      if (editorHint) editorHint.textContent = t('sprintEditorHint') || 'Selected users can update this sprint and its tasks.';
      setEditorOptions(getSelectedEditorIds());
      if (editorField) editorField.classList.toggle('hidden', !isAdminUser());

      setOptionText('planned', t('sprint_planned') || 'Planned');
      setOptionText('active', t('sprint_active') || 'Active');
      setOptionText('completed', t('sprint_completed') || 'Completed');

      if (cancelButton) {
        cancelButton.setAttribute('aria-label', t('cancel') || 'Cancel');
        cancelButton.title = t('cancel') || 'Cancel';
      }
      if (saveButton) {
        saveButton.setAttribute('aria-label', t('save') || 'Save');
        saveButton.title = t('save') || 'Save';
      }

      render();
    };

    const reset = () => {
      sprints = [];
      sprintTasks = [];
      assignableEditors = [];
      selectedEditorIds = [];
      isLoadingEditors = false;
      closeModal();
      render();
    };

    const handleSubmit = async (event) => {
      event.preventDefault();
      formError.classList.add('hidden');

      const name = nameInput.value.trim();
      if (!name) {
        formError.textContent = t('sprintNameRequired') || 'Sprint name is required';
        formError.classList.remove('hidden');
        return;
      }

      const payload = {
        name,
        goal: goalInput.value.trim() || null,
        start_date: startInput.value || null,
        end_date: endInput.value || null,
        status: statusInput.value || 'planned',
      };
      if (isAdminUser() && editorInput) {
        payload.editor_user_ids = getSelectedEditorIds();
      }

      let result;
      if (editingId) {
        result = await request(`/api/sprints/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        result = await request('/api/sprints', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (result.error) {
        formError.textContent = result.error;
        formError.classList.remove('hidden');
        return;
      }

      closeModal();
      showStatusToast(t('sprintSaved') || 'Sprint saved.');
      onSprintsChanged();
      await loadSprints();
    };

    const deleteSprint = async (sprint) => {
      const result = await request(`/api/sprints/${sprint.id}`, { method: 'DELETE' });
      if (result.error) {
        showStatusToast(result.error, 'error');
        return;
      }
      showStatusToast(t('sprintDeleted') || 'Sprint deleted.');
      onSprintsChanged();
      await loadSprints();
    };

    const bind = () => {
      openAddButton?.addEventListener('click', openAddModal);
      cancelButton?.addEventListener('click', closeModal);
      form?.addEventListener('submit', handleSubmit);
      modal?.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
      });
    };

    return { applyTranslations, bind, deleteSprint, loadSprints, render, reset };
  };

  window.SprintsModule = { create };
})();
