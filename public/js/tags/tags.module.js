// Tag management: tag list rendering, tag CRUD, tag autocomplete suggestions.
// Extracted from app.js. Shared mutable state (tags array, active tag filter)
// stays owned by app.js and is accessed through getter/setter callbacks.
(function () {
  const create = ({
    request,
    t,
    showStatusToast,
    getTasks,
    getTags,
    setTags,
    getTagFilter,
    setTagFilter,
    setCurrentView,
    showSection,
    loadTasks,
    confirmDeleteTag,
    onEditTagSubmitError,
  }) => {
    const tagList = document.getElementById('tag-list');
    const tagMessage = document.getElementById('tag-message');
    const tagForm = document.getElementById('tag-form');
    const taskTagSuggestions = document.getElementById('task-tag-suggestions');
    const editTaskTagSuggestions = document.getElementById('edit-task-tag-suggestions');
    const editTagModal = document.getElementById('edit-tag-modal');
    const editTagForm = document.getElementById('edit-tag-form');
    const editTagNameInput = document.getElementById('edit-tag-name-input');
    const editTagError = document.getElementById('edit-tag-error');

    let pendingEditTag = null;

    const loadTags = async () => {
      tagMessage.textContent = '';
      const result = await request('/api/tags');
      if (result.error) {
        tagMessage.textContent = result.error;
        return;
      }
      const tags = result.tags || [];
      setTags(tags);
      const filter = getTagFilter();
      if (filter && !tags.some((tag) => tag.name.toLowerCase() === filter.toLowerCase())) {
        setTagFilter('');
      }
      renderTags(tags);
    };

    const hideTagSuggestions = (panel) => {
      panel.classList.add('hidden');
      panel.innerHTML = '';
    };

    const showTagSuggestions = (input, panel) => {
      const query = input.value.trim().toLowerCase();
      const matches = getTags()
        .filter((tag) => !query || tag.name.toLowerCase().includes(query))
        .slice(0, 6);

      panel.innerHTML = '';
      if (!matches.length) {
        hideTagSuggestions(panel);
        return;
      }

      matches.forEach((tag) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'tag-suggestion-option';
        option.setAttribute('role', 'option');
        option.textContent = tag.name;
        option.addEventListener('mousedown', (event) => event.preventDefault());
        option.addEventListener('click', () => {
          input.value = tag.name;
          hideTagSuggestions(panel);
          input.focus();
        });
        panel.append(option);
      });

      panel.classList.remove('hidden');
    };

    const setupTagSuggestions = (input, panel) => {
      input.addEventListener('input', () => showTagSuggestions(input, panel));
      input.addEventListener('focus', () => showTagSuggestions(input, panel));
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          hideTagSuggestions(panel);
        }
      });
      input.addEventListener('blur', () => {
        setTimeout(() => hideTagSuggestions(panel), 120);
      });
    };

    const renderTags = (tags = getTags()) => {
      tagList.innerHTML = '';
      hideTagSuggestions(taskTagSuggestions);
      hideTagSuggestions(editTaskTagSuggestions);

      if (!tags.length) {
        const empty = document.createElement('p');
        empty.className = 'tag-empty';
        empty.textContent = t('noTags');
        tagList.append(empty);
        return;
      }

      const tasks = getTasks();
      const tagFilter = getTagFilter();

      tags.forEach((tag) => {
        const item = document.createElement('div');
        item.className = 'tag-manager-item';
        const tagTaskCount = tasks.filter((task) => (task.tag || '').toLowerCase() === tag.name.toLowerCase()).length;

        const name = document.createElement('button');
        name.type = 'button';
        name.className = `tag-manager-name ${tagFilter.toLowerCase() === tag.name.toLowerCase() ? 'active' : ''}`;
        const nameText = document.createElement('span');
        nameText.textContent = tag.name;
        name.append(nameText);
        if (tagTaskCount > 1) {
          const count = document.createElement('span');
          count.className = 'tag-manager-count';
          count.textContent = tagTaskCount;
          name.append(count);
        }
        name.addEventListener('click', () => {
          setTagFilter(tag.name);
          setCurrentView('tasks');
          showSection();
        });

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'secondary';
        editButton.textContent = t('edit');
        editButton.addEventListener('click', () => showEditTagModal(tag));

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'danger';
        deleteButton.textContent = t('delete');
        deleteButton.addEventListener('click', () => confirmDeleteTag(tag));

        const actions = document.createElement('div');
        actions.className = 'tag-manager-actions';
        actions.append(editButton, deleteButton);
        item.append(name, actions);
        tagList.append(item);
      });
    };

    const handleTagSubmit = async (event) => {
      event.preventDefault();
      tagMessage.textContent = '';

      const tagNameInput = document.getElementById('tag-name');
      const name = tagNameInput.value.trim();
      if (!name) {
        tagMessage.textContent = t('tagRequired');
        return;
      }
      if (name.length > 40) {
        tagMessage.textContent = t('tagTooLong');
        return;
      }

      const result = await request('/api/tags', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });

      if (result.error) {
        tagMessage.textContent = result.error;
        return;
      }

      tagForm.reset();
      showStatusToast(t('tagAdded'));
      loadTags();
    };

    const clearEditTagError = () => {
      editTagError.textContent = '';
      editTagError.classList.add('hidden');
    };

    const showEditTagModal = (tag) => {
      pendingEditTag = tag;
      clearEditTagError();
      editTagNameInput.value = tag.name;
      editTagModal.classList.remove('hidden');
      editTagNameInput.focus();
      editTagNameInput.select();
    };

    const hideEditTagModal = () => {
      pendingEditTag = null;
      editTagForm.reset();
      clearEditTagError();
      editTagModal.classList.add('hidden');
    };

    const renameTag = async (tag, name) => {
      const normalizedName = name.trim();
      if (!normalizedName) {
        editTagError.textContent = t('tagRequired');
        editTagError.classList.remove('hidden');
        return;
      }
      if (normalizedName.length > 40) {
        editTagError.textContent = t('tagTooLong');
        editTagError.classList.remove('hidden');
        return;
      }

      const result = await request(`/api/tags/${tag.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: normalizedName }),
      });

      if (result.error) {
        editTagError.textContent = result.error;
        editTagError.classList.remove('hidden');
        return;
      }

      if (getTagFilter().toLowerCase() === tag.name.toLowerCase()) {
        setTagFilter(normalizedName);
      }
      hideEditTagModal();
      showStatusToast(t('tagUpdated'));
      await loadTags();
      loadTasks();
    };

    const deleteTag = async (tag) => {
      const result = await request(`/api/tags/${tag.id}`, {
        method: 'DELETE',
      });

      if (result.error) {
        alert(result.error);
        return;
      }

      if (getTagFilter().toLowerCase() === tag.name.toLowerCase()) {
        setTagFilter('');
      }
      showStatusToast(t('tagDeleted'));
      await loadTags();
      loadTasks();
    };

    const handleEditTagSubmit = async (event) => {
      event.preventDefault();
      if (!pendingEditTag) return;
      clearEditTagError();
      await renameTag(pendingEditTag, editTagNameInput.value);
    };

    const isEditTagModalOpen = () => !editTagModal.classList.contains('hidden');

    return {
      loadTags,
      renderTags,
      hideTagSuggestions,
      showTagSuggestions,
      setupTagSuggestions,
      handleTagSubmit,
      showEditTagModal,
      hideEditTagModal,
      handleEditTagSubmit,
      renameTag,
      deleteTag,
      clearEditTagError,
      isEditTagModalOpen,
    };
  };

  window.TagsModule = { create };
})();
