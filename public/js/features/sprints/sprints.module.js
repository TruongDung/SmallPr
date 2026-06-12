(function () {
  const create = ({ request, t, showStatusToast, onSprintsChanged = () => {}, getCurrentUser = () => null }) => {
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
    const editorHint = document.getElementById('sprint-editor-hint');
    const formError = document.getElementById('sprint-form-error');
    const cancelButton = document.getElementById('cancel-sprint');
    const saveButton = document.getElementById('save-sprint');

    let sprints = [];
    let sprintTasks = [];
    let assignableEditors = [];
    let editingId = null;

    const statusLabels = {
      planned: () => t('sprint_planned') || 'Planned',
      active: () => t('sprint_active') || 'Active',
      completed: () => t('sprint_completed') || 'Completed',
    };

    const loadSprints = async () => {
      const [sprintsResult, tasksResult] = await Promise.all([
        request('/api/sprints'),
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
      render();
    };

    const normalizeSprintId = (value) => (value === null || value === undefined || value === ''
      ? null
      : Number(value));

    const isAdminUser = () => getCurrentUser()?.username === 'admin';
    const canDeleteSprint = (sprint) => Number(sprint.is_owner) === 1;
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
      return [...editorInput.selectedOptions]
        .map((option) => Number(option.value))
        .filter((id) => Number.isInteger(id) && id > 0);
    };

    const setEditorOptions = (selectedValues = []) => {
      if (!editorInput) return;
      const selectedIds = new Set(normalizeEditorIds(selectedValues).map(String));
      editorInput.innerHTML = '';

      if (!assignableEditors.length) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.disabled = true;
        emptyOption.textContent = t('sprintNoEditorsAvailable') || 'No eligible users';
        editorInput.append(emptyOption);
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

    const loadAssignableEditors = async (selectedValues = getSelectedEditorIds()) => {
      if (!isAdminUser() || !editorInput) return;
      const result = await request('/api/admin/users');
      if (result.error) {
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
      const title = document.createElement('strong');
      title.textContent = task.title;
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

    const createSprintCard = (sprint) => {
      const card = document.createElement('div');
      card.className = `sprint-card sprint-card-${sprint.status} sprint-drop-zone`;
      bindDropTarget(card, sprint.id);

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
      deleteBtn.className = 'task-action-icon secondary';
      deleteBtn.textContent = '×';
      deleteBtn.title = t('deleteSprint') || 'Delete Sprint';
      deleteBtn.setAttribute('aria-label', t('deleteSprint') || 'Delete Sprint');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSprint(sprint);
      });

      actions.append(editBtn);
      if (canDeleteSprint(sprint)) {
        actions.append(deleteBtn);
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
        createTaskList(sprintCardTasks, t('noSprintTasks') || 'Drop tasks here.', { removable: canRemoveTaskFromSprint })
      );

      return card;
    };

    const render = () => {
      if (!sprintsList) return;
      sprintsList.innerHTML = '';

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
      if (!confirm(`${t('deleteSprint') || 'Delete Sprint'}: "${sprint.name}"?`)) return;

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

    return { applyTranslations, bind, loadSprints, render, reset };
  };

  window.SprintsModule = { create };
})();
