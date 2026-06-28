// Related-task picker used by edit and preview task modals.
(function () {
  const MAX_RELATED_TASK_RESULTS = 2;

  const getRelatedTaskIds = (task) => {
    if (Array.isArray(task?.related_task_ids)) {
      return task.related_task_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id));
    }
    if (Array.isArray(task?.related_tasks)) {
      return task.related_tasks.map((related) => Number(related.id)).filter((id) => Number.isInteger(id));
    }
    return [];
  };

  const create = ({
    elements,
    getTasks,
    getAddTask,
    getEditTask,
    getPreviewTask,
    setAddTask,
    setEditTask,
    setPreviewTask,
    statusLabel,
    t,
    updateTask,
    showStatusToast,
    onEditRelatedTasksChange,
    onOpenRelatedTask,
  }) => {
    const resolveRelatedTask = (id, task) => {
      const numericId = Number(id);
      const live = getTasks().find((candidate) => Number(candidate.id) === numericId);
      if (live) return live;
      const snapshot = Array.isArray(task?.related_tasks)
        ? task.related_tasks.find((related) => Number(related.id) === numericId)
        : null;
      return snapshot || { id: numericId, title: '', status: 'todo' };
    };

    const pickers = {
      add: {
        list: elements.addList,
        count: elements.addCount,
        search: elements.addSearch,
        results: elements.addResults,
        getTask: getAddTask,
      },
      edit: {
        list: elements.editList,
        count: elements.editCount,
        search: elements.editSearch,
        results: elements.editResults,
        getTask: getEditTask,
      },
      preview: {
        list: elements.previewList,
        count: elements.previewCount,
        search: elements.previewSearch,
        results: elements.previewResults,
        getTask: getPreviewTask,
      },
    };

    const render = (pickerName) => {
      const picker = pickers[pickerName];
      const task = picker?.getTask();
      if (!picker?.list || !task) return;
      picker.list.innerHTML = '';

      const ids = getRelatedTaskIds(task);
      if (picker.count) {
        picker.count.textContent = t('relatedTasksCount', { count: ids.length });
      }

      if (!ids.length) {
        return;
      }

      ids.forEach((id) => {
        const related = resolveRelatedTask(id, task);
        const chip = document.createElement('div');
        chip.className = 'related-tasks-chip';

        const meta = document.createElement('div');
        meta.className = 'related-tasks-chip-meta';

        const isPreview = pickerName === 'preview';
        const canOpen = (isPreview || pickerName === 'edit')
          && typeof onOpenRelatedTask === 'function'
          && Number.isInteger(Number(id));
        const name = document.createElement(canOpen ? 'button' : 'span');
        name.className = 'related-tasks-chip-name';
        if (canOpen) {
          name.type = 'button';
          name.classList.add('related-tasks-chip-name-link');
          name.dataset.relatedId = String(id);
          name.dataset.relatedPicker = pickerName;
          const openLabel = t('relatedTaskOpen');
          // Fall back to the task title when the translation key is missing so
          // the tooltip stays readable rather than showing "relatedTaskOpen".
          name.title = openLabel === 'relatedTaskOpen' ? (related.title || '') : openLabel;
          name.setAttribute('aria-label',
            openLabel === 'relatedTaskOpen' ? `Open ${related.title || ''}` : openLabel);
        }
        // Truncate title to keep chip compact
        const maxTitleLength = 25;
        const fullTitle = related.title || t('previewTaskTitle');
        name.textContent = fullTitle.length > maxTitleLength 
          ? fullTitle.slice(0, maxTitleLength) + '…' 
          : fullTitle;
        if (fullTitle.length > maxTitleLength) {
          name.title = fullTitle; // Show full title on hover
        }

        const status = document.createElement('span');
        status.className = `status-badge status-${related.status || 'todo'} status-badge-compact`;
        // Use abbreviated status text for compact display
        const statusAbbrev = { todo: '○', in_progress: '◐', done: '●' };
        status.textContent = statusAbbrev[related.status] || statusAbbrev.todo;
        status.title = statusLabel(related.status); // Full text on hover

        meta.append(name, status);
        chip.append(meta);

        if (!picker.readOnly) {
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'related-tasks-chip-remove';
          remove.dataset.relatedId = String(id);
          remove.dataset.relatedPicker = pickerName;
          remove.setAttribute('aria-label', t('relatedTaskRemove'));
          remove.title = t('relatedTaskRemove');
          remove.textContent = '×';
          chip.append(remove);
        }

        picker.list.append(chip);
      });
    };

    const hideResults = (pickerName = 'preview') => {
      const results = pickers[pickerName]?.results;
      if (!results) return;
      results.classList.add('hidden');
      results.innerHTML = '';
    };

    const showResults = (pickerName = 'preview') => {
      const picker = pickers[pickerName];
      const task = picker?.getTask();
      if (!picker?.results || !task || picker.readOnly) return;
      const query = (picker.search?.value || '').trim().toLowerCase();
      const linked = new Set(getRelatedTaskIds(task));

      const matches = getTasks()
        .filter((candidate) => !task.id || Number(candidate.id) !== Number(task.id))
        .filter((candidate) => !linked.has(Number(candidate.id)))
        .filter((candidate) => !query || (candidate.title || '').toLowerCase().includes(query))
        .slice(0, MAX_RELATED_TASK_RESULTS);

      picker.results.innerHTML = '';
      if (!matches.length) {
        const empty = document.createElement('div');
        empty.className = 'related-tasks-result-empty';
        empty.textContent = query ? t('relatedTasksNoMatches') : t('relatedTasksAllLinked');
        picker.results.append(empty);
        picker.results.classList.remove('hidden');
        return;
      }

      matches.forEach((candidate) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'related-tasks-result-option';
        option.setAttribute('role', 'option');

        const name = document.createElement('span');
        name.className = 'related-tasks-result-name';
        // Truncate title to keep dropdown compact
        const maxTitleLength = 30;
        const fullTitle = candidate.title || t('previewTaskTitle');
        name.textContent = fullTitle.length > maxTitleLength 
          ? fullTitle.slice(0, maxTitleLength) + '…' 
          : fullTitle;
        if (fullTitle.length > maxTitleLength) {
          option.title = fullTitle; // Show full title on hover
        }

        const status = document.createElement('span');
        status.className = `status-badge status-${candidate.status || 'todo'} status-badge-compact`;
        // Use abbreviated status for compact display
        const statusAbbrev = { todo: '○', in_progress: '◐', done: '●' };
        status.textContent = statusAbbrev[candidate.status] || statusAbbrev.todo;
        status.title = statusLabel(candidate.status); // Full text on hover

        option.append(name, status);
        option.addEventListener('mousedown', (event) => event.preventDefault());
        option.addEventListener('click', () => add(pickerName, candidate.id));
        picker.results.append(option);
      });

      picker.results.classList.remove('hidden');
    };

    const savePreviewIds = async (ids) => {
      const task = getPreviewTask();
      if (!task) return;
      
      // Optimistic update: update state and render immediately
      setPreviewTask({
        ...task,
        related_task_ids: ids,
        related_tasks: ids.map((id) => resolveRelatedTask(id, task)),
      });
      render('preview');
      if (document.activeElement === elements.previewSearch) {
        showResults('preview');
      } else {
        hideResults('preview');
      }
      
      // Send to server in background
      const result = await updateTask(task.id, { related_task_ids: ids });
      if (result?.task) {
        setPreviewTask(result.task);
        render('preview');
        showStatusToast(t('taskSaved'));
      }
    };

    const setEditIds = (ids) => {
      const task = getEditTask();
      if (!task) return;
      setEditTask({
        ...task,
        related_task_ids: ids,
        related_tasks: ids.map((id) => resolveRelatedTask(id, task)),
      });
      render('edit');
      hideResults('edit');
      onEditRelatedTasksChange?.(ids);
    };

    const add = (pickerName, id) => {
      const picker = pickers[pickerName];
      const task = picker?.getTask();
      if (!task || picker.readOnly) return;
      const next = [...new Set([...getRelatedTaskIds(task), Number(id)])];
      if (picker.search) picker.search.value = '';
      hideResults(pickerName);
      if (pickerName === 'add') {
        setAddTask({
          ...task,
          related_task_ids: next,
          related_tasks: next.map((relatedId) => resolveRelatedTask(relatedId, task)),
        });
        render('add');
        hideResults('add');
        return;
      }
      if (pickerName === 'edit') {
        setEditIds(next);
        return;
      }
      savePreviewIds(next);
    };

    const remove = (pickerName, id) => {
      const picker = pickers[pickerName];
      const task = picker?.getTask();
      if (!task || picker.readOnly) return;
      const next = getRelatedTaskIds(task).filter((existing) => existing !== Number(id));
      if (pickerName === 'add') {
        setAddTask({
          ...task,
          related_task_ids: next,
          related_tasks: next.map((relatedId) => resolveRelatedTask(relatedId, task)),
        });
        render('add');
        return;
      }
      if (pickerName === 'edit') {
        setEditIds(next);
        return;
      }
      savePreviewIds(next);
    };

    const handleListClick = (event) => {
      const removeButton = event.target.closest('.related-tasks-chip-remove');
      if (removeButton) {
        remove(removeButton.dataset.relatedPicker || 'preview', removeButton.dataset.relatedId);
        return;
      }

      const openButton = event.target.closest('.related-tasks-chip-name-link');
      if (openButton && typeof onOpenRelatedTask === 'function') {
        const id = Number(openButton.dataset.relatedId);
        if (Number.isInteger(id)) {
          onOpenRelatedTask(id, openButton.dataset.relatedPicker || 'preview');
        }
      }
    };

    const bind = () => {
      elements.editList?.addEventListener('click', handleListClick);
      elements.addList?.addEventListener('click', handleListClick);
      elements.previewList?.addEventListener('click', handleListClick);

      elements.addSearch?.addEventListener('input', () => showResults('add'));
      elements.addSearch?.addEventListener('focus', () => showResults('add'));
      elements.addSearch?.addEventListener('blur', () => {
        window.setTimeout(() => hideResults('add'), 120);
      });

      elements.editSearch?.addEventListener('input', () => showResults('edit'));
      elements.editSearch?.addEventListener('focus', () => showResults('edit'));
      elements.editSearch?.addEventListener('blur', () => {
        window.setTimeout(() => hideResults('edit'), 120);
      });

      elements.previewSearch?.addEventListener('input', () => showResults('preview'));
      elements.previewSearch?.addEventListener('focus', () => showResults('preview'));
      elements.previewSearch?.addEventListener('blur', () => {
        window.setTimeout(() => hideResults('preview'), 120);
      });
    };

    return {
      bind,
      getRelatedTaskIds,
      hideResults,
      render,
      showResults,
    };
  };

  window.RelatedTasksModule = { create, getRelatedTaskIds };
})();
