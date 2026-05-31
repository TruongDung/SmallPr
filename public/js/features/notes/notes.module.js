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

    let notes = [];
    let activeNoteId = null;
    let saveTimer = null;
    let pendingSave = false;
    let showPreview = false;

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
        item.className = `notes-list-item ${note.id === activeNoteId ? 'active' : ''}`;
        item.dataset.noteId = String(note.id);

        const title = document.createElement('strong');
        title.className = 'notes-list-title';
        title.textContent = note.title?.trim() || t('untitledNote');

        const meta = document.createElement('span');
        meta.className = 'notes-list-meta';
        const dateText = formatRelativeDate(note.updated_at);
        const preview = previewBody(note.body);
        meta.textContent = preview ? `${dateText} · ${preview}` : dateText;

        item.append(title, meta);
        item.addEventListener('click', () => selectNote(note.id));
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

    const setMessage = (text = '') => {
      message.textContent = text;
    };

    const saveActiveNote = async () => {
      if (!activeNoteId) return;
      const note = notes.find((entry) => entry.id === activeNoteId);
      if (!note) return;

      const title = titleInput.value;
      const body = bodyInput.value;

      if (note.title === title && note.body === body) return;

      savedIndicator.textContent = t('noteSaving');
      const result = await request(`/api/notes/${activeNoteId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, body }),
      });

      if (result.error) {
        setMessage(result.error);
        savedIndicator.textContent = '';
        return;
      }

      const updated = result.note;
      notes = notes.map((entry) => (entry.id === updated.id ? updated : entry));
      notes.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
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
      savedIndicator.textContent = '';
      titleInput.focus();

      (async () => {
        if (hadPendingSave && previousNoteId) {
          const previousNote = notes.find((entry) => entry.id === previousNoteId);
          if (previousNote && (previousNote.title !== previousTitle || previousNote.body !== previousBody)) {
            const saveResult = await request(`/api/notes/${previousNoteId}`, {
              method: 'PUT',
              body: JSON.stringify({ title: previousTitle, body: previousBody }),
            });
            if (!saveResult.error && saveResult.note) {
              notes = notes.map((entry) => (entry.id === saveResult.note.id ? saveResult.note : entry));
            }
          }
        }

        const result = await request('/api/notes', {
          method: 'POST',
          body: JSON.stringify({ title: titleInput.value, body: bodyInput.value }),
        });

        if (result.error) {
          setMessage(result.error);
          return;
        }

        notes.unshift(result.note);
        activeNoteId = result.note.id;
        notes.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
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
      const result = await request('/api/notes');
      if (result.error) {
        setMessage(result.error);
        return;
      }

      notes = result.notes || [];
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
      searchInput.addEventListener('input', renderList);
      window.addEventListener('beforeunload', flushSave);

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

    return { applyTranslations, bind, load, deleteNote };
  };

  window.NotesModule = { create };
}());
