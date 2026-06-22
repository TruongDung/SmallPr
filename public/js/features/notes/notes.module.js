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
    let notes = [];
    let tasks = [];
    let activeNoteId = null;
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
        titleInput.value = '';
        bodyInput.value = '';
        if (taskSelect) taskSelect.value = '';
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

    const reset = () => {
      dataVersion += 1;
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      notes = [];
      tasks = [];
      activeNoteId = null;
      pendingSave = false;
      setMessage('');
      showEditor(null);
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
      const [notesResult, tasksResult, archivedTasksResult] = await Promise.all([
        request('/api/notes', { cache: 'no-store' }),
        request('/api/tasks', { cache: 'no-store' }),
        request('/api/tasks?archived=true', { cache: 'no-store' }),
      ]);
      if (version !== dataVersion) return;
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
      if (checkboxButton) {
        checkboxButton.textContent = `☐ ${t('noteCheckbox')}`;
        checkboxButton.title = t('noteCheckbox');
      }
      if (taskLabel) taskLabel.textContent = t('linkedTask');
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
}());
