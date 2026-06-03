// Shared zero-dependency utility functions for the Task Manager frontend.
// Extracted from app.js to reduce duplication and improve testability.
(function () {
  // ---- HTML / text ----

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const isSafeLinkHref = (href = '') => /^(https?:|mailto:)/i.test(href);

  const autolinkPlainUrls = (html = '') => html.replace(
    /(^|[\s>])((https?:\/\/)[^\s<]+)/gi,
    (match, prefix, url) => `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );

  const linkifyPlainText = (value = '') => autolinkPlainUrls(escapeHtml(value)).replace(/\n/g, '<br>');

  const richTextAllowedTags = new Set([
    'A', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL',
    'UL', 'OL', 'LI', 'P', 'DIV', 'BR', 'LABEL', 'INPUT', 'SPAN'
  ]);

  const hasRichTextMarkup = (value = '') =>
    /<\/?(a|b|strong|i|em|u|s|strike|del|ul|ol|li|p|div|br|label|input|span)\b/i.test(value);

  const sanitizeRichText = (html = '') => {
    const template = document.createElement('template');
    template.innerHTML = autolinkPlainUrls(html);

    template.content.querySelectorAll('*').forEach((element) => {
      const style = element.getAttribute('style') || '';
      if (element.tagName === 'SPAN' && /text-decoration[^;:]*:\s*[^;]*line-through|text-decoration-line[^;:]*:\s*[^;]*line-through/i.test(style)) {
        const strike = document.createElement('s');
        strike.append(...element.childNodes);
        element.replaceWith(strike);
        return;
      }

      const href = element.tagName === 'A' ? element.getAttribute('href') || '' : '';
      const inputType = element.tagName === 'INPUT' ? (element.getAttribute('type') || '').toLowerCase() : '';
      const isChecked = element.tagName === 'INPUT' && (element.checked || element.hasAttribute('checked'));
      const className = element.getAttribute('class') || '';
      [...element.attributes].forEach((attribute) => element.removeAttribute(attribute.name));

      if (!richTextAllowedTags.has(element.tagName)) {
        element.replaceWith(...element.childNodes);
        return;
      }

      if (element.tagName === 'A') {
        if (!isSafeLinkHref(href)) {
          element.replaceWith(...element.childNodes);
          return;
        }
        element.href = href;
        element.target = '_blank';
        element.rel = 'noopener noreferrer';
      }

      if (element.tagName === 'INPUT') {
        if (inputType !== 'checkbox') {
          element.remove();
          return;
        }
        element.type = 'checkbox';
        element.className = 'rich-check-input';
        element.setAttribute('data-rich-checklist', 'true');
        if (isChecked) element.setAttribute('checked', '');
        return;
      }

      if (element.tagName === 'LABEL' && className.includes('rich-check-item')) {
        element.className = `rich-check-item${element.querySelector('input[type="checkbox"]:checked') ? ' checked' : ''}`;
        return;
      }

      if (element.tagName === 'SPAN' && className.includes('rich-check-text')) {
        element.className = 'rich-check-text';
      }
    });

    return template.innerHTML.trim();
  };

  const renderStoredRichText = (value = '') => (
    hasRichTextMarkup(value) ? sanitizeRichText(value) : linkifyPlainText(value)
  );

  const getRichTextPlainText = (html = '') => {
    if (!hasRichTextMarkup(html)) return String(html || '').trim();
    const container = document.createElement('div');
    container.innerHTML = sanitizeRichText(html);
    return container.textContent.trim();
  };

  const setRichEditorValue = (editor, value = '') => {
    if (hasRichTextMarkup(value)) {
      editor.innerHTML = sanitizeRichText(value);
      return;
    }
    editor.textContent = value;
  };

  const getRichEditorValue = (editor) => {
    const html = sanitizeRichText(editor.innerHTML);
    return getRichTextPlainText(html) ? html : '';
  };

  const getRichEditorLength = (editor) => getRichTextPlainText(editor.innerHTML).length;

  const richEditorSelections = new WeakMap();

  const saveRichEditorSelection = (editor) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      richEditorSelections.set(editor, range.cloneRange());
    }
  };

  const restoreRichEditorSelection = (editor) => {
    const range = richEditorSelections.get(editor);
    if (!range) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const placeCaretInside = (element) => {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const getActiveChecklistBlock = (editor) => {
    const selection = window.getSelection();
    const selectedNode = selection?.rangeCount ? selection.getRangeAt(0).commonAncestorContainer : null;
    const baseNode = selectedNode?.nodeType === Node.TEXT_NODE ? selectedNode.parentElement : selectedNode;
    const checkItem = baseNode?.closest?.('.rich-check-item') || document.activeElement?.closest?.('.rich-check-item');
    if (!checkItem || !editor.contains(checkItem)) return null;
    return checkItem.closest('div') || checkItem;
  };

  const insertLineAfterChecklist = (editor) => {
    const checklistBlock = getActiveChecklistBlock(editor);
    if (!checklistBlock) return false;
    const nextLine = document.createElement('div');
    nextLine.append(document.createElement('br'));
    checklistBlock.after(nextLine);
    editor.focus();
    placeCaretInside(nextLine);
    saveRichEditorSelection(editor);
    return true;
  };

  const syncChecklistItem = (checkbox) => {
    const item = checkbox.closest('.rich-check-item');
    checkbox.toggleAttribute('checked', checkbox.checked);
    if (item) item.classList.toggle('checked', checkbox.checked);
  };

  const insertChecklistItem = (editor) => {
    editor.focus();
    restoreRichEditorSelection(editor);
    const id = `check-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    document.execCommand(
      'insertHTML',
      false,
      `<div><label class="rich-check-item"><input id="${id}" class="rich-check-input" data-rich-checklist="true" type="checkbox"> <span class="rich-check-text">Checklist item</span></label></div>`
    );
    editor.innerHTML = sanitizeRichText(editor.innerHTML);
    saveRichEditorSelection(editor);
  };

  const setupRichTextEditors = () => {
    document.querySelectorAll('.rich-editor-toolbar button').forEach((button) => {
      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });

      button.addEventListener('click', () => {
        const editor = document.getElementById(button.dataset.editor);
        if (!editor) return;

        editor.focus();
        restoreRichEditorSelection(editor);
        if (button.dataset.command === 'insertChecklist') {
          insertChecklistItem(editor);
          return;
        }
        document.execCommand(button.dataset.command, false, null);
        saveRichEditorSelection(editor);
      });
    });

    document.querySelectorAll('.rich-editor-surface').forEach((editor) => {
      editor.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          if (event.shiftKey) return;
          if (insertLineAfterChecklist(editor)) {
            event.preventDefault();
          }
        }
        if (event.key === 'Backspace' && getRichEditorLength(editor) === 0) {
          editor.innerHTML = '';
        }
      });

      editor.addEventListener('input', () => {
        saveRichEditorSelection(editor);
      });

      editor.addEventListener('click', () => {
        saveRichEditorSelection(editor);
      });

      editor.addEventListener('keyup', () => {
        saveRichEditorSelection(editor);
      });
    });

    document.querySelectorAll('.rich-editor-surface[contenteditable]').forEach((editor) => {
      editor.addEventListener('paste', (event) => {
        event.preventDefault();
        const text = event.clipboardData?.getData('text/plain') || '';
        restoreRichEditorSelection(editor);
        document.execCommand('insertText', false, text);
        saveRichEditorSelection(editor);
      });
    });
  };

  const openRichTextLinksWithModifier = (container) => {
    container.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
      if (!link || !container.contains(link)) return;
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        window.open(link.href, '_blank', 'noopener,noreferrer');
      }
    });
  };

  // ---- Task helpers ----

  const taskMatchesSearch = (task, query) => {
    if (!query) return true;
    const haystack = [
      task.title,
      getRichTextPlainText(task.description || ''),
      getRichTextPlainText(task.comment || ''),
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  };

  const priorityLabel = (priority, t) => t(priority || 'medium');

  const priorityRank = (priority = 'medium') => ({
    high: 0,
    medium: 1,
    low: 2,
  }[priority] ?? 3);

  const sortTasksByPriority = (taskList = []) => [...taskList].sort((first, second) => (
    priorityRank(first.priority) - priorityRank(second.priority)
  ));

  const taskStatus = (task) => task.status || (task.completed ? 'done' : 'todo');

  const statusLabel = (status, t) => t(status || 'todo');

  // ---- File helpers ----

  const readAttachmentFile = (file, onProgress = () => {}) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(new Error('Failed to read file')));
    reader.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
    });
    reader.readAsDataURL(file);
  });

  const fileFromClipboard = (clipboardData) => {
    const files = clipboardData?.files;
    if (files?.length) return files[0];
    const items = clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.kind === 'file') return item.getAsFile();
      }
    }
    return null;
  };

  const isPdfAttachment = (task) => {
    const type = String(task?.attachment_type || '').toLowerCase();
    const name = String(task?.attachment_name || '').toLowerCase();
    return type === 'application/pdf' || name.endsWith('.pdf');
  };

  const isImageAttachment = (task) => {
    const type = String(task?.attachment_type || '').toLowerCase();
    const name = String(task?.attachment_name || '').toLowerCase();
    return type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
  };

  // ---- Date helpers ----

  const formatDateEST = (dateString) => {
    const date = new Date(dateString);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const parts = formatter.formatToParts(date);
    const formattedParts = {};
    parts.forEach(part => { formattedParts[part.type] = part.value; });
    return `${formattedParts.month}/${formattedParts.day}/${formattedParts.year}, ${formattedParts.hour}:${formattedParts.minute}:${formattedParts.second} ${formattedParts.dayPeriod} EST (NYC)`;
  };

  const formatLocalDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const formatDateTimeLocalValue = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const isTodayDateTimeValue = (value) => {
    if (!value) return false;
    const [datePart] = value.split('T');
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return datePart === `${year}-${month}-${day}`;
  };

  const closePickerAfterTodaySelection = (input) => {
    const dismissIfToday = () => {
      if (isTodayDateTimeValue(input.value)) {
        setTimeout(() => input.blur(), 0);
      }
    };
    input.addEventListener('input', dismissIfToday);
    input.addEventListener('change', dismissIfToday);
  };

  // Export
  window.AppUtils = {
    escapeHtml,
    isSafeLinkHref,
    autolinkPlainUrls,
    linkifyPlainText,
    hasRichTextMarkup,
    sanitizeRichText,
    renderStoredRichText,
    getRichTextPlainText,
    setRichEditorValue,
    getRichEditorValue,
    getRichEditorLength,
    saveRichEditorSelection,
    restoreRichEditorSelection,
    placeCaretInside,
    getActiveChecklistBlock,
    insertLineAfterChecklist,
    syncChecklistItem,
    insertChecklistItem,
    setupRichTextEditors,
    openRichTextLinksWithModifier,
    taskMatchesSearch,
    priorityLabel,
    priorityRank,
    sortTasksByPriority,
    taskStatus,
    statusLabel,
    readAttachmentFile,
    fileFromClipboard,
    isPdfAttachment,
    isImageAttachment,
    formatDateEST,
    formatLocalDateTime,
    formatDateTimeLocalValue,
    isTodayDateTimeValue,
    closePickerAfterTodaySelection,
  };
})();
