(function () {
  const create = ({ request, t, showStatusToast, confirmDelete }) => {
    const section = document.getElementById('notes-section');
    const list = document.getElementById('notes-list');
    const message = document.getElementById('notes-message');
    const searchInput = document.getElementById('notes-search-input');
    const addButton = document.getElementById('add-note-button');
    const editorEmpty = document.getElementById('notes-editor-empty');
    const editorForm = document.getElementById('notes-editor-form');
    const titleInput = document.getElementById('note-title-input');
    const bodyInput = document.getElementById('note-body-input');
    const deleteButton = document.getElementById('delete-note-button');
    const savedIndicator = document.getElementById('note-saved-indicator');
    const previewDiv = document.getElementById('note-preview');
    const togglePreviewButton = document.getElementById('toggle-preview-button');
    const pasteButton = document.getElementById('note-paste-button');
    const checkboxButton = document.getElementById('note-checkbox-button');
    const taskLabel = document.getElementById('note-task-label');
    const taskSelect = document.getElementById('note-task-select');

    // Folder management
    const foldersList = document.getElementById('notes-folders-list');
    const addFolderButton = document.getElementById('add-folder-button');
    const folderSelect = document.getElementById('note-folder-select');
    const folderLabel = document.getElementById('note-folder-label');

    let notes = [];
    let tasks = [];
    let folders = [];
    let activeNoteId = null;
    let activeFolderId = null; // null = root (all notes)
    let creatingFolder = false; // inline create-folder input is open
    let saveTimer = null;
    let pendingSave = false;
    let showPreview = true;
    let dataVersion = 0;

    // Pinned notes float to the top; within each group the most recently
    // updated comes first. Mirrors the server's ORDER BY so the optimistic
    // client ordering matches what a reload returns.
    const sortNotes = () => {
      notes.sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) {
          return a.pinned ? -1 : 1;
        }
        return String(b.updated_at).localeCompare(String(a.updated_at));
      });
    };

    const formatRelativeDate = (isoString) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      if (Number.isNaN(date.getTime())) return '';
      const now = new Date();
      const sameDay = date.toDateString() === now.toDateString();
      if (sameDay) {
        return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      }
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const previewBody = (body) => {
      const trimmed = String(body || '').trim();
      if (!trimmed) return '';
      const firstLine = trimmed.split('\n').find((line) => line.trim()) || '';
      return firstLine.slice(0, 80);
    };

    const normalizeTaskId = (value) => {
      const normalized = Number(value);
      return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
    };

    const updateTaskOptions = () => {
      if (!taskSelect) return;
      const selected = taskSelect.value;
      taskSelect.innerHTML = '';

      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = t('noLinkedTask');
      taskSelect.append(empty);

      tasks.forEach((task) => {
        const option = document.createElement('option');
        option.value = String(task.id);
        option.textContent = task.title || t('untitledNote');
        taskSelect.append(option);
      });

      taskSelect.value = tasks.some((task) => String(task.id) === selected) ? selected : '';
    };

    const filteredNotes = () => {
      let filtered = notes;
      // Filter by active folder
      filtered = filtered.filter((note) => {
        if (activeFolderId === null) {
          return note.folder_id === null || note.folder_id === undefined;
        }
        return note.folder_id === activeFolderId;
      });
      // Filter by search query
      const query = searchInput.value.trim().toLowerCase();
      if (!query) return filtered;
      return filtered.filter((note) => {
        const haystack = `${note.title || ''} ${note.body || ''}`.toLowerCase();
        return haystack.includes(query);
      });
    };

    const folderNoteCount = (folderId) =>
      notes.filter((note) => {
        if (folderId === null) return note.folder_id === null || note.folder_id === undefined;
        return note.folder_id === folderId;
      }).length;

    // Persist a note's folder assignment (used by the editor select and by
    // drag-and-drop onto a folder).
    const moveNoteToFolder = async (noteId, folderId) => {
      const note = notes.find((entry) => entry.id === noteId);
      if (!note) return;
      const previous = note.folder_id ?? null;
      const next = folderId ?? null;
      if (previous === next) return;

      // Optimistic update so the list and counts react instantly.
      note.folder_id = next;
      renderFolders();
      renderList();
      if (folderSelect && activeNoteId === noteId) folderSelect.value = next ? String(next) : '';

      const result = await request(`/api/notes/${noteId}/folder`, {
        method: 'PATCH',
        body: JSON.stringify({ folder_id: next }),
      });

      if (result.error) {
        note.folder_id = previous; // roll back
        renderFolders();
        renderList();
        showStatusToast(result.error || t('folderMoveFailed') || 'Failed to move note', 'error');
        return;
      }
      if (result.note) {
        notes = notes.map((entry) => (entry.id === result.note.id ? result.note : entry));
      }
      renderFolders();
    };

    const selectFolder = (folderId) => {
      activeFolderId = folderId;
      renderFolders();
      renderList();
      // Open the first note in the selected folder (if any), else clear editor.
      const firstNote = filteredNotes()[0];
      if (firstNote) {
        selectNote(firstNote.id);
      } else {
        activeNoteId = null;
        showEditor(null);
      }
    };

    const buildFolderRow = ({ id, icon, name, isActive, count, renamable }) => {
      const item = document.createElement('li');
      item.className = `notes-folder-item ${isActive ? 'active' : ''}`;
      item.dataset.folderId = id === null ? '' : String(id);

      const iconSpan = document.createElement('span');
      iconSpan.className = 'notes-folder-icon';
      iconSpan.textContent = icon;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'notes-folder-name';
      nameSpan.textContent = name;

      const countBadge = document.createElement('span');
      countBadge.className = 'notes-folder-count';
      countBadge.textContent = String(count);

      item.append(iconSpan, nameSpan, countBadge);
      item.addEventListener('click', () => selectFolder(id));

      // Accept notes dragged onto this folder.
      item.addEventListener('dragover', (event) => {
        event.preventDefault();
        item.classList.add('drop-target');
      });
      item.addEventListener('dragleave', () => item.classList.remove('drop-target'));
      item.addEventListener('drop', (event) => {
        event.preventDefault();
        item.classList.remove('drop-target');
        const draggedId = Number(event.dataTransfer?.getData('text/note-id'));
        if (Number.isInteger(draggedId)) moveNoteToFolder(draggedId, id);
      });

      if (renamable) {
        const actions = document.createElement('div');
        actions.className = 'notes-folder-actions';

        const renameBtn = document.createElement('button');
        renameBtn.type = 'button';
        renameBtn.className = 'notes-folder-action-btn';
        renameBtn.innerHTML = '✎';
        renameBtn.title = t('renameFolder') || 'Rename';
        renameBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          startInlineRename(item, id, name);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'notes-folder-action-btn danger';
        deleteBtn.innerHTML = '🗑';
        deleteBtn.title = t('delete') || 'Delete';
        deleteBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          deleteFolder(id, name);
        });

        actions.append(renameBtn, deleteBtn);
        item.append(actions);
      }

      return item;
    };

    const renderFolders = () => {
      if (!foldersList) return;
      foldersList.innerHTML = '';

      // "All Notes" pseudo-folder (root).
      foldersList.append(
        buildFolderRow({
          id: null,
          icon: '🗒',
          name: t('allNotes') || 'All Notes',
          isActive: activeFolderId === null,
          count: folderNoteCount(null),
          renamable: false,
        }),
      );

      folders.forEach((folder) => {
        foldersList.append(
          buildFolderRow({
            id: folder.id,
            icon: '📁',
            name: folder.name,
            isActive: folder.id === activeFolderId,
            count: folderNoteCount(folder.id),
            renamable: true,
          }),
        );
      });

      // Keep the editor's folder dropdown in sync.
      updateFolderOptions();
    };

    const updateFolderOptions = () => {
      if (!folderSelect) return;
      const selected = folderSelect.value;
      folderSelect.innerHTML = '';
      const none = document.createElement('option');
      none.value = '';
      none.textContent = t('noFolder') || 'No folder';
      folderSelect.append(none);
      folders.forEach((folder) => {
        const option = document.createElement('option');
        option.value = String(folder.id);
        option.textContent = folder.name;
        folderSelect.append(option);
      });
      folderSelect.value = folders.some((f) => String(f.id) === selected) ? selected : '';
    };

    // Inline create: replaces prompt() with an in-list text input.
    const startInlineCreate = () => {
      if (creatingFolder || !foldersList) return;
      creatingFolder = true;

      const item = document.createElement('li');
      item.className = 'notes-folder-item';
      const iconSpan = document.createElement('span');
      iconSpan.className = 'notes-folder-icon';
      iconSpan.textContent = '📁';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'notes-folder-name-input';
      input.maxLength = 100;
      input.placeholder = t('folderNamePlaceholder') || 'Folder name';
      item.append(iconSpan, input);
      foldersList.append(item);
      input.focus();

      let finished = false;
      const commit = async () => {
        if (finished) return;
        finished = true;
        const name = input.value.trim();
        creatingFolder = false;
        if (!name) {
          renderFolders();
          return;
        }
        const result = await request('/api/note-folders', {
          method: 'POST',
          body: JSON.stringify({ name, description: '' }),
        });
        if (result.error) {
          showStatusToast(result.error, 'error');
          renderFolders();
          return;
        }
        if (result.folder) {
          folders.push(result.folder);
          folders.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
          activeFolderId = result.folder.id;
        }
        renderFolders();
        renderList();
        showStatusToast(t('folderCreated') || 'Folder created', 'success');
      };
      const cancel = () => {
        if (finished) return;
        finished = true;
        creatingFolder = false;
        renderFolders();
      };

      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          cancel();
        }
      });
      input.addEventListener('blur', commit);
    };

    const startInlineRename = (item, folderId, currentName) => {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return;
      item.innerHTML = '';
      const iconSpan = document.createElement('span');
      iconSpan.className = 'notes-folder-icon';
      iconSpan.textContent = '📁';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'notes-folder-name-input';
      input.maxLength = 100;
      input.value = currentName;
      item.append(iconSpan, input);
      input.focus();
      input.select();

      let finished = false;
      const commit = async () => {
        if (finished) return;
        finished = true;
        const name = input.value.trim();
        if (!name || name === currentName) {
          renderFolders();
          return;
        }
        const result = await request(`/api/note-folders/${folderId}`, {
          method: 'PUT',
          body: JSON.stringify({ name, description: folder.description || '' }),
        });
        if (result.error) {
          showStatusToast(result.error, 'error');
          renderFolders();
          return;
        }
        if (result.folder) {
          folders = folders.map((f) => (f.id === result.folder.id ? result.folder : f));
        }
        renderFolders();
        renderList();
      };
      const cancel = () => {
        if (finished) return;
        finished = true;
        renderFolders();
      };

      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          cancel();
        }
      });
      input.addEventListener('blur', commit);
    };

    const deleteFolder = (folderId, folderName) => {
      const item = foldersList?.querySelector(`.notes-folder-item[data-folder-id="${folderId}"]`);
      if (!item) return;

      // Inline confirm row: keeps things smooth (no native dialog).
      item.innerHTML = '';
      item.classList.add('confirming');

      const label = document.createElement('span');
      label.className = 'notes-folder-name';
      label.textContent = `${t('deleteFolderQuestion') || 'Delete'} "${folderName}"?`;

      const actions = document.createElement('div');
      actions.className = 'notes-folder-actions';
      actions.style.display = 'flex';

      const yesBtn = document.createElement('button');
      yesBtn.type = 'button';
      yesBtn.className = 'notes-folder-action-btn danger';
      yesBtn.innerHTML = '✓';
      yesBtn.title = t('confirm') || 'Confirm';

      const noBtn = document.createElement('button');
      noBtn.type = 'button';
      noBtn.className = 'notes-folder-action-btn';
      noBtn.innerHTML = '✕';
      noBtn.title = t('cancel') || 'Cancel';

      yesBtn.addEventListener('click', async (event) => {
        event.stopPropagation();
        const result = await request(`/api/note-folders/${folderId}`, { method: 'DELETE' });
        if (result.error) {
          showStatusToast(result.error || 'Failed to delete folder', 'error');
          renderFolders();
          return;
        }
        folders = folders.filter((f) => f.id !== folderId);
        // Notes in that folder were moved to root server-side.
        notes = notes.map((n) => (n.folder_id === folderId ? { ...n, folder_id: null } : n));
        if (activeFolderId === folderId) activeFolderId = null;
        renderFolders();
        renderList();
        showStatusToast(t('folderDeleted') || 'Folder deleted', 'success');
      });

      noBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        renderFolders();
      });

      actions.append(yesBtn, noBtn);
      item.append(label, actions);
    };

    const showEditor = (note) => {
      if (!note) {
        editorForm.classList.add('hidden');
        editorEmpty.classList.remove('hidden');
        titleInput.value = '';
        bodyInput.value = '';
        if (taskSelect) taskSelect.value = '';
        if (folderSelect) folderSelect.value = '';
        if (showPreview) updatePreview();
        savedIndicator.textContent = '';
        return;
      }
      editorEmpty.classList.add('hidden');
      editorForm.classList.remove('hidden');
      titleInput.value = note.title || '';
      bodyInput.value = note.body || '';
      if (taskSelect) {
        updateTaskOptions();
        taskSelect.value = note.task_id ? String(note.task_id) : '';
      }
      if (folderSelect) {
        updateFolderOptions();
        folderSelect.value = note.folder_id ? String(note.folder_id) : '';
      }
      savedIndicator.textContent = '';
      if (showPreview) {
        updatePreview();
      }
    };

    const renderList = () => {
      list.innerHTML = '';
      const visibleNotes = filteredNotes();

      if (!visibleNotes.length) {
        const empty = document.createElement('li');
        empty.className = 'notes-empty';
        empty.textContent = t('notesEmpty');
        list.append(empty);
        return;
      }

      visibleNotes.forEach((note) => {
        const item = document.createElement('li');
        item.className = `notes-list-item ${note.id === activeNoteId ? 'active' : ''} ${note.pinned ? 'pinned' : ''}`;
        item.dataset.noteId = String(note.id);
        item.draggable = true;

        // Drag a note onto a folder to move it.
        item.addEventListener('dragstart', (event) => {
          event.dataTransfer?.setData('text/note-id', String(note.id));
          if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
          item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => item.classList.remove('dragging'));

        const content = document.createElement('div');
        content.className = 'notes-list-content';

        const title = document.createElement('strong');
        title.className = 'notes-list-title';
        title.textContent = note.title?.trim() || t('untitledNote');

        const meta = document.createElement('span');
        meta.className = 'notes-list-meta';
        const dateText = formatRelativeDate(note.updated_at);
        const preview = previewBody(note.body);
        const linkedTask = note.task_title ? `↔ ${note.task_title}` : '';
        meta.textContent = [dateText, linkedTask, preview].filter(Boolean).join(' · ');

        content.append(title, meta);
        content.addEventListener('click', () => selectNote(note.id));

        const pinButton = document.createElement('button');
        pinButton.type = 'button';
        pinButton.className = `notes-pin-button ${note.pinned ? 'pinned' : ''}`;
        pinButton.textContent = '📌';
        const pinLabel = note.pinned ? t('unpinNote') : t('pinNote');
        pinButton.setAttribute('aria-label', pinLabel);
        pinButton.setAttribute('aria-pressed', note.pinned ? 'true' : 'false');
        pinButton.title = pinLabel;
        pinButton.addEventListener('click', (event) => {
          event.stopPropagation();
          togglePin(note.id);
        });

        item.append(content, pinButton);
        list.append(item);
      });
    };

    const selectNote = (id) => {
      const note = notes.find((entry) => entry.id === id);
      if (!note) return;
      activeNoteId = id;
      // Opening an existing note defaults to preview mode.
      setPreviewMode(true);
      showEditor(note);
      renderList();
    };

    const togglePin = async (id) => {
      const note = notes.find((entry) => entry.id === id);
      if (!note) return;

      const nextPinned = !note.pinned;
      // Optimistically reorder so the note jumps to/from the top immediately.
      note.pinned = nextPinned;
      sortNotes();
      renderList();

      const result = await request(`/api/notes/${id}/pin`, {
        method: 'PATCH',
        body: JSON.stringify({ pinned: nextPinned }),
      });

      if (result.error) {
        // Roll back the optimistic change on failure.
        note.pinned = !nextPinned;
        sortNotes();
        renderList();
        setMessage(result.error);
        return;
      }

      notes = notes.map((entry) => (entry.id === result.note.id ? result.note : entry));
      sortNotes();
      renderList();
    };

    const setMessage = (text = '') => {
      message.textContent = text;
    };

    const saveActiveNote = async () => {
      if (!activeNoteId) return;
      const note = notes.find((entry) => entry.id === activeNoteId);
      if (!note) return;

      const title = titleInput.value;
      const body = bodyInput.value;
      const taskId = normalizeTaskId(taskSelect?.value);

      if (note.title === title && note.body === body && normalizeTaskId(note.task_id) === taskId) return;

      savedIndicator.textContent = t('noteSaving');
      const result = await request(`/api/notes/${activeNoteId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, body, task_id: taskId }),
      });

      if (result.error) {
        setMessage(result.error);
        savedIndicator.textContent = '';
        return;
      }

      const updated = result.note;
      notes = notes.map((entry) => (entry.id === updated.id ? updated : entry));
      sortNotes();
      savedIndicator.textContent = t('noteSaved');
      renderList();
    };

    const scheduleSave = () => {
      if (saveTimer) clearTimeout(saveTimer);
      pendingSave = true;
      savedIndicator.textContent = t('noteSaving');
      saveTimer = setTimeout(async () => {
        pendingSave = false;
        await saveActiveNote();
      }, 600);
    };

    const flushSave = async () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      if (pendingSave) {
        pendingSave = false;
        await saveActiveNote();
      }
    };

    const addNote = () => {
      // Capture the previously active note's edits before we repurpose the
      // shared editor inputs for the new note.
      const previousNoteId = activeNoteId;
      const previousTitle = titleInput.value;
      const previousBody = bodyInput.value;
      const previousTaskId = normalizeTaskId(taskSelect?.value);
      const hadPendingSave = pendingSave || Boolean(saveTimer);
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      pendingSave = false;

      // Show an empty editor and focus the title synchronously so iOS places
      // the cursor and opens the keyboard within the user's tap gesture.
      // Focusing after an await would lose the gesture and iOS would ignore it.
      activeNoteId = null;
      editorEmpty.classList.add('hidden');
      editorForm.classList.remove('hidden');
      titleInput.value = '';
      bodyInput.value = '';
      if (taskSelect) {
        updateTaskOptions();
        taskSelect.value = '';
      }
      savedIndicator.textContent = '';
      // A brand-new note starts in edit mode (raw textarea visible) so the
      // user can type the body right away instead of seeing an empty preview.
      setPreviewMode(false);
      titleInput.focus();

      (async () => {
        if (hadPendingSave && previousNoteId) {
          const previousNote = notes.find((entry) => entry.id === previousNoteId);
          if (
            previousNote &&
            (previousNote.title !== previousTitle ||
              previousNote.body !== previousBody ||
              normalizeTaskId(previousNote.task_id) !== previousTaskId)
          ) {
            const saveResult = await request(`/api/notes/${previousNoteId}`, {
              method: 'PUT',
              body: JSON.stringify({
                title: previousTitle,
                body: previousBody,
                task_id: previousTaskId,
              }),
            });
            if (!saveResult.error && saveResult.note) {
              notes = notes.map((entry) => (entry.id === saveResult.note.id ? saveResult.note : entry));
            }
          }
        }

        const result = await request('/api/notes', {
          method: 'POST',
          body: JSON.stringify({
            title: titleInput.value,
            body: bodyInput.value,
            task_id: normalizeTaskId(taskSelect?.value),
            folder_id: activeFolderId,
          }),
        });

        if (result.error) {
          setMessage(result.error);
          return;
        }

        notes.unshift(result.note);
        activeNoteId = result.note.id;
        sortNotes();
        renderFolders();
        renderList();
      })();
    };

    const deleteNote = async (note) => {
      if (!note) return;

      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
        pendingSave = false;
      }

      const result = await request(`/api/notes/${note.id}`, { method: 'DELETE' });
      if (result.error) {
        setMessage(result.error);
        return;
      }

      notes = notes.filter((entry) => entry.id !== note.id);
      if (activeNoteId === note.id) {
        activeNoteId = notes[0]?.id || null;
        showEditor(notes.find((entry) => entry.id === activeNoteId) || null);
      }
      renderFolders();
      renderList();
    };

    const reset = () => {
      dataVersion += 1;
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      notes = [];
      tasks = [];
      folders = [];
      activeNoteId = null;
      activeFolderId = null;
      pendingSave = false;
      setMessage('');
      showEditor(null);
      renderFolders();
      renderList();
    };

    const requestDeleteActive = async () => {
      if (!activeNoteId) return;
      const note = notes.find((entry) => entry.id === activeNoteId);
      if (!note) return;
      await flushSave();
      if (typeof confirmDelete === 'function') {
        confirmDelete(note);
      } else {
        await deleteNote(note);
      }
    };

    const load = async () => {
      const version = dataVersion;
      const [notesResult, tasksResult, archivedTasksResult, foldersResult] = await Promise.all([
        request('/api/notes', { cache: 'no-store' }),
        request('/api/tasks', { cache: 'no-store' }),
        request('/api/tasks?archived=true', { cache: 'no-store' }),
        request('/api/note-folders', { cache: 'no-store' }),
      ]);
      if (version !== dataVersion) return;
      if (notesResult.error) {
        setMessage(notesResult.error);
        return;
      }

      notes = notesResult.notes || [];
      tasks = [
        ...(tasksResult.error ? [] : tasksResult.tasks || []),
        ...(archivedTasksResult.error ? [] : archivedTasksResult.tasks || []),
      ];
      folders = foldersResult.folders || [];

      updateTaskOptions();
      renderFolders();
      setMessage('');

      if (!notes.length) {
        activeNoteId = null;
        showEditor(null);
        renderList();
        return;
      }

      if (!activeNoteId || !notes.some((note) => note.id === activeNoteId)) {
        activeNoteId = notes[0].id;
      }
      showEditor(notes.find((note) => note.id === activeNoteId));
      renderList();
    };

    const applyTranslations = () => {
      addButton.setAttribute('aria-label', t('newNote'));
      addButton.title = t('newNote');
      deleteButton.setAttribute('aria-label', t('deleteNote'));
      deleteButton.title = t('deleteNote');
      titleInput.placeholder = t('notePlaceholderTitle');
      bodyInput.placeholder = t('notePlaceholderBody');
      if (pasteButton) {
        pasteButton.textContent = t('notePaste');
        pasteButton.title = t('notePaste');
      }
      if (checkboxButton) {
        checkboxButton.textContent = `☐ ${t('noteCheckbox')}`;
        checkboxButton.title = t('noteCheckbox');
      }
      if (taskLabel) taskLabel.textContent = t('linkedTask');
      if (folderLabel) folderLabel.textContent = t('folder') || 'Folder';
      updateTaskOptions();
      updateFolderOptions();
      searchInput.placeholder = t('searchNotes');
      const editorEmptyText = section.querySelector('#notes-editor-empty p');
      if (editorEmptyText) editorEmptyText.textContent = t('notesEmpty');
      const titleHeading = document.getElementById('notes-title');
      if (titleHeading) titleHeading.textContent = t('notes');
      renderList();
    };

    const bind = () => {
      addButton.addEventListener('click', addNote);
      deleteButton.addEventListener('click', requestDeleteActive);

      // Add folder functionality
      if (addFolderButton) {
        addFolderButton.addEventListener('click', startInlineCreate);
      }
      if (folderSelect) {
        folderSelect.addEventListener('change', () => {
          if (!activeNoteId) return;
          const value = folderSelect.value;
          moveNoteToFolder(activeNoteId, value ? Number(value) : null);
        });
      }
      titleInput.addEventListener('input', scheduleSave);
      bodyInput.addEventListener('input', () => {
        scheduleSave();
        if (showPreview) {
          updatePreview();
        }
      });

      // When the user types "---" on a line and presses Enter, keep the "---"
      // in place (it renders as <hr> in preview) and move the cursor to a new
      // blank line below it.
      bodyInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        const value = bodyInput.value;
        const pos = bodyInput.selectionStart;
        const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
        const currentLine = value.slice(lineStart, pos);
        if (currentLine !== '---') return;
        event.preventDefault();
        const before = value.slice(0, pos);
        const after = value.slice(bodyInput.selectionEnd);
        bodyInput.value = `${before}\n${after}`;
        const caret = pos + 1;
        bodyInput.setSelectionRange(caret, caret);
        scheduleSave();
        if (showPreview) updatePreview();
      });
      titleInput.addEventListener('blur', flushSave);
      bodyInput.addEventListener('blur', flushSave);
      taskSelect?.addEventListener('change', scheduleSave);
      searchInput.addEventListener('input', renderList);
      window.addEventListener('beforeunload', flushSave);

      // Toggle preview button
      if (togglePreviewButton) {
        togglePreviewButton.addEventListener('click', () => {
          const enteringEditMode = showPreview;
          setPreviewMode(!showPreview);
          // When switching into edit mode, drop the caret at the end of the
          // body and scroll there. Done synchronously inside the tap gesture so
          // iOS opens the keyboard and honors the caret position on long notes.
          if (enteringEditMode) {
            focusBodyAtEnd();
          }
        });
      }

      if (checkboxButton) {
        checkboxButton.addEventListener('click', insertCheckbox);
      }

      // Toggle a task-list checkbox when its rendered counterpart is clicked in
      // the preview. The input's checked state is driven by the source body, so
      // prevent the default toggle and let toggleCheckboxLine re-render.
      // Clicking elsewhere in the preview does NOT enter edit mode — use the
      // Edit button for that.
      if (previewDiv) {
        previewDiv.addEventListener('click', (event) => {
          const input = event.target.closest('.note-check-input');
          if (input) {
            event.preventDefault();
            const label = input.closest('[data-check-index]');
            const index = Number(label?.dataset.checkIndex);
            if (Number.isInteger(index)) toggleCheckboxLine(index);
          }
          // Links still work; all other clicks are inert (no edit-on-tap).
        });
      }

      // --- OCR: detect image paste and extract text ---
      const ocrBar = document.getElementById('note-ocr-bar');
      const ocrStatus = document.getElementById('note-ocr-status');
      const ocrExtractBtn = document.getElementById('note-ocr-extract');
      const ocrDismissBtn = document.getElementById('note-ocr-dismiss');
      let ocrPendingText = '';

      const hideOcrBar = () => {
        ocrBar?.classList.add('hidden');
        ocrExtractBtn?.classList.add('hidden');
        ocrDismissBtn?.classList.add('hidden');
        ocrPendingText = '';
      };

      const insertOcrText = () => {
        if (!ocrPendingText) return;
        const current = bodyInput.value;
        const needsNewline = current.length > 0 && !current.endsWith('\n');
        const insertion = (needsNewline ? '\n' : '') + '--- OCR Text ---\n' + ocrPendingText + '\n';
        bodyInput.value = current + insertion;
        bodyInput.focus();
        const end = bodyInput.value.length;
        bodyInput.setSelectionRange(end, end);
        scheduleSave();
        if (showPreview) updatePreview();
        hideOcrBar();
      };

      ocrExtractBtn?.addEventListener('click', insertOcrText);
      ocrDismissBtn?.addEventListener('click', hideOcrBar);

      // Handle Ctrl+V / Cmd+V image paste directly on the textarea
      bodyInput.addEventListener('paste', async (event) => {
        const items = event.clipboardData?.items;
        if (!items) return;
        let imageFile = null;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            imageFile = item.getAsFile();
            break;
          }
        }
        if (!imageFile) return;
        event.preventDefault();
        if (!window.Tesseract) return;
        ocrBar?.classList.remove('hidden');
        ocrExtractBtn?.classList.add('hidden');
        ocrDismissBtn?.classList.remove('hidden');
        if (ocrStatus) ocrStatus.textContent = 'Detecting text in image...';
        try {
          const result = await window.Tesseract.recognize(imageFile, 'eng+vie', {
            logger: (info) => {
              if (info.status === 'recognizing text' && ocrStatus) {
                ocrStatus.textContent = `Extracting text... ${Math.round((info.progress || 0) * 100)}%`;
              }
            },
          });
          const text = (result.data?.text || '').trim();
          if (text) {
            ocrPendingText = text;
            if (ocrStatus) ocrStatus.textContent = `Found ${text.split('\n').length} line(s) of text.`;
            ocrExtractBtn?.classList.remove('hidden');
          } else {
            if (ocrStatus) ocrStatus.textContent = 'No text found in image.';
            setTimeout(hideOcrBar, 3000);
          }
        } catch (_err) {
          if (ocrStatus) ocrStatus.textContent = 'OCR failed. Try again.';
          setTimeout(hideOcrBar, 3000);
        }
      });

      // Paste clipboard contents onto a new last line of the note body.
      if (pasteButton) {
        pasteButton.addEventListener('click', async () => {
          // Nothing to paste into until a note is open in the editor.
          if (editorForm.classList.contains('hidden')) return;

          // Try reading clipboard items (supports images + text)
          let handledImage = false;
          try {
            if (navigator.clipboard.read) {
              const items = await navigator.clipboard.read();
              for (const item of items) {
                // Check for image types first
                const imageType = item.types.find((type) => type.startsWith('image/'));
                if (imageType && window.Tesseract) {
                  const blob = await item.getType(imageType);
                  handledImage = true;
                  // Trigger OCR
                  ocrBar?.classList.remove('hidden');
                  ocrExtractBtn?.classList.add('hidden');
                  ocrDismissBtn?.classList.remove('hidden');
                  if (ocrStatus) ocrStatus.textContent = 'Detecting text in image...';
                  try {
                    const result = await window.Tesseract.recognize(blob, 'eng+vie', {
                      logger: (info) => {
                        if (info.status === 'recognizing text' && ocrStatus) {
                          const percent = Math.round((info.progress || 0) * 100);
                          ocrStatus.textContent = `Extracting text... ${percent}%`;
                        }
                      },
                    });
                    const ocrText = (result.data?.text || '').trim();
                    if (ocrText) {
                      ocrPendingText = ocrText;
                      if (ocrStatus) ocrStatus.textContent = `Found ${ocrText.split('\n').length} line(s) of text.`;
                      ocrExtractBtn?.classList.remove('hidden');
                    } else {
                      if (ocrStatus) ocrStatus.textContent = 'No text found in image.';
                      setTimeout(hideOcrBar, 3000);
                    }
                  } catch (_ocrError) {
                    if (ocrStatus) ocrStatus.textContent = 'OCR failed. Try again.';
                    setTimeout(hideOcrBar, 3000);
                  }
                  break;
                }
              }
            }
          } catch (_error) {
            // clipboard.read() not supported or permission denied — fall through to readText
          }

          if (handledImage) return;

          // Fall back to text paste
          let text = '';
          try {
            text = await navigator.clipboard.readText();
          } catch (_error) {
            // Silently fail on iOS or when clipboard read is blocked.
            return;
          }

          if (!text) return;

          // Append on a fresh last line, adding a separating newline only when
          // the body is non-empty and doesn't already end with one.
          const current = bodyInput.value;
          const needsNewline = current.length > 0 && !current.endsWith('\n');
          bodyInput.value = current + (needsNewline ? '\n' : '') + text;

          // Move the caret to the end so the user continues after the paste.
          bodyInput.focus();
          const end = bodyInput.value.length;
          bodyInput.setSelectionRange(end, end);

          // Persist and refresh the preview, mirroring the input handler.
          scheduleSave();
          if (showPreview) {
            updatePreview();
          }
        });
      }

      // Make links clickable in the note body with Ctrl/Cmd + Click
      bodyInput.addEventListener('click', (e) => {
        if (!e.ctrlKey && !e.metaKey) return;

        const text = bodyInput.value;
        const cursorPos = bodyInput.selectionStart;

        // URL regex pattern
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let match;

        // Find if cursor is on a URL
        while ((match = urlRegex.exec(text)) !== null) {
          const urlStart = match.index;
          const urlEnd = match.index + match[0].length;

          if (cursorPos >= urlStart && cursorPos <= urlEnd) {
            e.preventDefault();
            const url = match[0];
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
          }
        }
      });

      // Update title attribute to show Ctrl+Click hint on URLs
      bodyInput.addEventListener('mouseup', () => {
        const text = bodyInput.value;
        const cursorPos = bodyInput.selectionStart;

        // URL regex pattern
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let match;
        let onUrl = false;

        // Check if cursor is on a URL
        while ((match = urlRegex.exec(text)) !== null) {
          const urlStart = match.index;
          const urlEnd = match.index + match[0].length;

          if (cursorPos >= urlStart && cursorPos <= urlEnd) {
            onUrl = true;
            bodyInput.title = 'Ctrl+Click to open link';
            break;
          }
        }

        if (!onUrl) {
          bodyInput.title = '';
        }
      });
    };

    const updatePreview = () => {
      if (!previewDiv || !window.NotesCodeHighlighter) return;
      const highlighted = window.NotesCodeHighlighter.detectAndHighlightCodeBlocks(bodyInput.value);
      previewDiv.innerHTML = highlighted || '<p style="color: #999;">Nothing to preview</p>';
    };

    // Switch between preview (read-only rendered markdown) and edit (raw
    // textarea) modes, keeping the toggle button label in sync.
    const setPreviewMode = (enabled) => {
      showPreview = enabled;
      bodyInput.classList.toggle('hidden', enabled);
      if (previewDiv) previewDiv.classList.toggle('hidden', !enabled);
      if (togglePreviewButton) {
        togglePreviewButton.textContent = enabled ? 'Edit' : 'Preview';
      }
      if (enabled) updatePreview();
    };

    // Focus the body textarea and place the caret at the very end, scrolling
    // the textarea so the caret is visible. Used when entering edit mode on a
    // long note so the user lands where they left off rather than at the top.
    const focusBodyAtEnd = () => {
      const end = bodyInput.value.length;
      bodyInput.focus();
      try {
        bodyInput.setSelectionRange(end, end);
      } catch {
        // setSelectionRange can throw on some input types; ignore safely.
      }
      bodyInput.scrollTop = bodyInput.scrollHeight;
    };

    // Insert a `- [ ] ` task-list marker on its own line at the caret. Starts a
    // fresh line when the caret isn't already at the beginning of one so the
    // markdown checkbox renders correctly in preview.
    const insertCheckbox = () => {
      if (editorForm.classList.contains('hidden')) return;
      const marker = '- [ ] ';
      const value = bodyInput.value;
      const start = bodyInput.selectionStart ?? value.length;
      const end = bodyInput.selectionEnd ?? start;
      const atLineStart = start === 0 || value[start - 1] === '\n';
      const insertion = (atLineStart ? '' : '\n') + marker;

      bodyInput.value = value.slice(0, start) + insertion + value.slice(end);
      const caret = start + insertion.length;
      bodyInput.focus();
      bodyInput.setSelectionRange(caret, caret);

      scheduleSave();
      if (showPreview) updatePreview();
    };

    // Flip the Nth `- [ ] ` / `- [x] ` line in the body. Called when a checkbox
    // in the rendered preview is clicked; data-check-index matches the order the
    // highlighter assigned while rendering.
    const toggleCheckboxLine = (index) => {
      const lines = bodyInput.value.split('\n');
      const pattern = /^(\s*[-*]\s+\[)([ xX])(\]\s+.*)$/;
      let seen = -1;
      for (let i = 0; i < lines.length; i += 1) {
        const match = lines[i].match(pattern);
        if (!match) continue;
        seen += 1;
        if (seen === index) {
          const next = match[2].toLowerCase() === 'x' ? ' ' : 'x';
          lines[i] = `${match[1]}${next}${match[3]}`;
          break;
        }
      }
      bodyInput.value = lines.join('\n');
      scheduleSave();
      updatePreview();
    };

    const openNoteById = (id) => {
      const note = notes.find((entry) => Number(entry.id) === Number(id));
      if (note) {
        selectNote(note.id);
      }
    };

    return { applyTranslations, bind, load, deleteNote, openNoteById, reset };
  };

  window.NotesModule = { create };
})();
