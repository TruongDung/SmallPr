// Related-task picker used by edit and preview task modals.
(function () {
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
    getEditTask,
    getPreviewTask,
    setEditTask,
    setPreviewTask,
    statusLabel,
    t,
    updateTask,
    showStatusToast,
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
        readOnly: true,
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
        const empty = document.createElement('div');
        empty.className = 'related-tasks-empty';
        empty.textContent = t('relatedTasksEmpty');
        picker.list.append(empty);
        return;
      }

      ids.forEach((id) => {
        const related = resolveRelatedTask(id, task);
        const chip = document.createElement('div');
        chip.className = 'related-tasks-chip';

        const meta = document.createElement('div');
        meta.className = 'related-tasks-chip-meta';

        const name = document.createElement('span');
        name.className = 'related-tasks-chip-name';
        name.textContent = related.title || t('previewTaskTitle');

        const status = document.createElement('span');
        status.className = `status-badge status-${related.status || 'todo'}`;
        status.textContent = statusLabel(related.status);

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
        .filter((candidate) => Number(candidate.id) !== Number(task.id))
        .filter((candidate) => !linked.has(Number(candidate.id)))
        .filter((candidate) => !query || (candidate.title || '').toLowerCase().includes(query))
        .slice(0, 6);

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
        name.textContent = candidate.title || t('previewTaskTitle');

        const status = document.createElement('span');
        status.className = `status-badge status-${candidate.status || 'todo'}`;
        status.textContent = statusLabel(candidate.status);

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
      const result = await updateTask(task.id, { related_task_ids: ids });
      if (result?.task) {
        setPreviewTask(result.task);
        render('preview');
        if (document.activeElement === elements.previewSearch) {
          showResults('preview');
        } else {
          hideResults('preview');
        }
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
    };

    const add = (pickerName, id) => {
      const picker = pickers[pickerName];
      const task = picker?.getTask();
      if (!task || picker.readOnly) return;
      const next = [...new Set([...getRelatedTaskIds(task), Number(id)])];
      if (picker.search) picker.search.value = '';
      hideResults(pickerName);
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
      if (pickerName === 'edit') {
        setEditIds(next);
        return;
      }
      savePreviewIds(next);
    };

    const handleListClick = (event) => {
      const removeButton = event.target.closest('.related-tasks-chip-remove');
      if (!removeButton) return;
      remove(removeButton.dataset.relatedPicker || 'preview', removeButton.dataset.relatedId);
    };

    const bind = () => {
      elements.editList?.addEventListener('click', handleListClick);
      elements.previewList?.addEventListener('click', handleListClick);

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
