(function () {
  const create = ({ request, t, showStatusToast }) => {
    const sprintsSection = document.getElementById('sprints-section');
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
    const formError = document.getElementById('sprint-form-error');
    const cancelButton = document.getElementById('cancel-sprint');
    const saveButton = document.getElementById('save-sprint');

    let sprints = [];
    let editingId = null;

    const statusLabels = {
      planned: () => t('sprint_planned') || 'Planned',
      active: () => t('sprint_active') || 'Active',
      completed: () => t('sprint_completed') || 'Completed',
    };

    const statusColors = {
      planned: '#6b7280',
      active: '#d97706',
      completed: '#16a34a',
    };

    const loadSprints = async () => {
      const result = await request('/api/sprints');
      if (result.error) {
        showStatusToast(result.error, 'error');
        return;
      }
      sprints = result.sprints || [];
      render();
    };

    const render = () => {
      if (!sprintsList) return;
      sprintsList.innerHTML = '';

      if (!sprints.length) {
        const empty = document.createElement('p');
        empty.className = 'sprints-empty';
        empty.textContent = t('noSprints') || 'No sprints yet. Create your first sprint!';
        sprintsList.append(empty);
        return;
      }

      sprints.forEach((sprint) => {
        const card = document.createElement('div');
        card.className = `sprint-card sprint-card-${sprint.status}`;

        const header = document.createElement('div');
        header.className = 'sprint-card-header';

        const name = document.createElement('h3');
        name.className = 'sprint-card-name';
        name.textContent = sprint.name;

        const badge = document.createElement('span');
        badge.className = `sprint-status-badge sprint-status-${sprint.status}`;
        badge.textContent = (statusLabels[sprint.status] || statusLabels.planned)();

        header.append(name, badge);
        card.append(header);

        if (sprint.goal) {
          const goal = document.createElement('p');
          goal.className = 'sprint-card-goal';
          goal.textContent = sprint.goal;
          card.append(goal);
        }

        const meta = document.createElement('div');
        meta.className = 'sprint-card-meta';

        if (sprint.start_date || sprint.end_date) {
          const dates = document.createElement('span');
          dates.className = 'sprint-card-dates';
          dates.textContent = `${sprint.start_date || '...'} -> ${sprint.end_date || '...'}`;
          meta.append(dates);
        }

        const taskCount = document.createElement('span');
        taskCount.className = 'sprint-card-tasks';
        taskCount.textContent = `${sprint.task_count || 0} ${t('sprintTasks') || 'tasks'}`;
        meta.append(taskCount);

        card.append(meta);

        const actions = document.createElement('div');
        actions.className = 'sprint-card-actions';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'task-action-icon secondary';
        editBtn.textContent = 'E';
        editBtn.title = t('editSprint') || 'Edit Sprint';
        editBtn.setAttribute('aria-label', t('editSprint') || 'Edit Sprint');
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditModal(sprint);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'task-action-icon secondary';
        deleteBtn.textContent = 'X';
        deleteBtn.title = t('deleteSprint') || 'Delete Sprint';
        deleteBtn.setAttribute('aria-label', t('deleteSprint') || 'Delete Sprint');
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteSprint(sprint);
        });

        actions.append(editBtn, deleteBtn);
        card.append(actions);
        sprintsList.append(card);
      });
    };

    const openAddModal = () => {
      editingId = null;
      modalTitle.textContent = t('newSprint') || 'New Sprint';
      form.reset();
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
