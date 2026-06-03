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
    const taskLabel = document.getElementById('note-task-label');
    const taskSelect = document.getElementById('note-task-select');
    const historyButton = document.getElementById('note-history-button');
    const historyModal = document.getElementById('note-history-modal');
    const historyTitle = document.getElementById('note-history-title');
    const historyMessage = document.getElementById('note-history-message');
    const historyList = document.getElementById('note-history-list');
    const closeHistoryButton = document.getElementById('close-note-history');

    let notes = [];
    let tasks = [];
    let activeNoteId = null;
    let saveTimer = null;
    let pendingSave = false;
    let showPreview = false;

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
      const query = searchInput.value.trim().toLowerCase();
      if (!query) return notes;
      return notes.filter((note) => {
        const haystack = `${note.title || ''} ${note.body || ''}`.toLowerCase();
        return haystack.includes(query);
      });
    };

    const showEditor = (note) => {
      if (!note) {
        editorForm.classList.add('hidden');
        editorEmpty.classList.remove('hidden');
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
      titleInput.focus();

      (async () => {
        if (hadPendingSave && previousNoteId) {
          const previousNote = notes.find((entry) => entry.id === previousNoteId);
          if (
            previousNote
            && (
              previousNote.title !== previousTitle
              || previousNote.body !== previousBody
              || normalizeTaskId(previousNote.task_id) !== previousTaskId
            )
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
          }),
        });

        if (result.error) {
          setMessage(result.error);
          return;
        }

        notes.unshift(result.note);
        activeNoteId = result.note.id;
        sortNotes();
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
      const [notesResult, tasksResult, archivedTasksResult] = await Promise.all([
        request('/api/notes'),
        request('/api/tasks'),
        request('/api/tasks?archived=true'),
      ]);
      if (notesResult.error) {
        setMessage(notesResult.error);
        return;
      }

      notes = notesResult.notes || [];
      tasks = [
        ...(tasksResult.error ? [] : (tasksResult.tasks || [])),
        ...(archivedTasksResult.error ? [] : (archivedTasksResult.tasks || [])),
      ];
      updateTaskOptions();
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
      if (taskLabel) taskLabel.textContent = t('linkedTask');
      if (historyButton) historyButton.textContent = t('noteHistory');
      if (historyTitle) historyTitle.textContent = t('noteHistory');
      if (closeHistoryButton) closeHistoryButton.textContent = t('cancel');
      updateTaskOptions();
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
      titleInput.addEventListener('input', scheduleSave);
      bodyInput.addEventListener('input', () => {
        scheduleSave();
        if (showPreview) {
          updatePreview();
        }
      });
      titleInput.addEventListener('blur', flushSave);
      bodyInput.addEventListener('blur', flushSave);
      taskSelect?.addEventListener('change', scheduleSave);
      searchInput.addEventListener('input', renderList);
      window.addEventListener('beforeunload', flushSave);
      historyButton?.addEventListener('click', openHistory);
      closeHistoryButton?.addEventListener('click', closeHistory);
      historyModal?.addEventListener('click', (event) => {
        if (event.target === historyModal) closeHistory();
      });

      // Toggle preview button
      if (togglePreviewButton) {
        togglePreviewButton.addEventListener('click', () => {
          showPreview = !showPreview;
          bodyInput.classList.toggle('hidden', showPreview);
          previewDiv.classList.toggle('hidden', !showPreview);
          togglePreviewButton.textContent = showPreview ? 'Edit' : 'Preview';
          if (showPreview) {
            updatePreview();
          }
        });
      }

      // Paste clipboard contents onto a new last line of the note body.
      if (pasteButton) {
        pasteButton.addEventListener('click', async () => {
          // Nothing to paste into until a note is open in the editor.
          if (editorForm.classList.contains('hidden')) return;

          let text = '';
          try {
            text = await navigator.clipboard.readText();
          } catch (_error) {
            // Reads can be blocked by browser permissions or a non-secure
            // context; surface a short hint rather than throwing.
            savedIndicator.textContent = t('notePasteFailed');
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

    const closeHistory = () => {
      historyModal?.classList.add('hidden');
    };

    const restoreVersion = async (version) => {
      if (!activeNoteId) return;
      titleInput.value = version.title || '';
      bodyInput.value = version.body || '';
      if (taskSelect) taskSelect.value = version.task_id ? String(version.task_id) : '';
      if (showPreview) updatePreview();
      await saveActiveNote();
      closeHistory();
    };

    const openHistory = async () => {
      if (!activeNoteId || !historyModal || !historyList) return;
      historyList.innerHTML = '';
      historyMessage.textContent = '';
      historyModal.classList.remove('hidden');

      const result = await request(`/api/notes/${activeNoteId}/versions`);
      if (result.error) {
        historyMessage.textContent = result.error;
        return;
      }

      const versions = result.versions || [];
      if (!versions.length) {
        historyMessage.textContent = t('noteHistoryEmpty');
        return;
      }

      versions.forEach((version) => {
        const item = document.createElement('article');
        item.className = 'note-history-item';

        const heading = document.createElement('strong');
        heading.textContent = version.title?.trim() || t('untitledNote');

        const meta = document.createElement('span');
        const date = formatRelativeDate(version.created_at);
        const linkedTask = version.task_title ? `↔ ${version.task_title}` : '';
        meta.textContent = [date, linkedTask].filter(Boolean).join(' · ');

        const body = document.createElement('p');
        body.textContent = previewBody(version.body) || '—';

        const restoreButton = document.createElement('button');
        restoreButton.type = 'button';
        restoreButton.className = 'secondary';
        restoreButton.textContent = t('restoreVersion');
        restoreButton.addEventListener('click', () => restoreVersion(version));

        item.append(heading, meta, body, restoreButton);
        historyList.append(item);
      });
    };

    return { applyTranslations, bind, load, deleteNote };
  };

  window.NotesModule = { create };
}());
