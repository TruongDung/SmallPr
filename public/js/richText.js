// Rich text rendering and editor behavior shared by task modals.
(function () {
  const create = ({ escapeHtml }) => {
    const allowedTags = new Set(['A', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'UL', 'OL', 'LI', 'P', 'DIV', 'BR', 'LABEL', 'INPUT', 'SPAN']);
    const editorSelections = new WeakMap();

    const hasRichTextMarkup = (value = '') => /<\/?(a|b|strong|i|em|u|s|strike|del|ul|ol|li|p|div|br|label|input|span)\b/i.test(value);
    const isSafeLinkHref = (href = '') => /^(https?:|mailto:)/i.test(href);

    const autolinkPlainUrls = (html = '') => html.replace(
      /(^|[\s>])((https?:\/\/)[^\s<]+)/gi,
      (match, prefix, url) => `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );

    const linkifyPlainText = (value = '') => autolinkPlainUrls(escapeHtml(value)).replace(/\n/g, '<br>');

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

        if (!allowedTags.has(element.tagName)) {
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

        if ((element.tagName === 'LABEL' || element.tagName === 'SPAN') && className.includes('rich-check-item')) {
          const item = document.createElement('span');
          item.className = `rich-check-item${element.querySelector('input[type="checkbox"]:checked') ? ' checked' : ''}`;
          item.append(...element.childNodes);
          element.replaceWith(item);
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

    const syncChecklistItem = (checkbox) => {
      const item = checkbox.closest('.rich-check-item');
      checkbox.toggleAttribute('checked', checkbox.checked);
      if (item) item.classList.toggle('checked', checkbox.checked);
    };

    const saveRichEditorSelection = (editor) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        editorSelections.set(editor, range.cloneRange());
      }
    };

    const restoreRichEditorSelection = (editor) => {
      const range = editorSelections.get(editor);
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

    const insertChecklistItem = (editor) => {
      editor.focus();
      restoreRichEditorSelection(editor);
      const id = `check-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      document.execCommand(
        'insertHTML',
        false,
        `<div><span class="rich-check-item"><input id="${id}" class="rich-check-input" data-rich-checklist="true" type="checkbox"> <span class="rich-check-text">Checklist item</span></span></div>`
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
        editor.addEventListener('keyup', () => saveRichEditorSelection(editor));
        editor.addEventListener('mouseup', () => saveRichEditorSelection(editor));
        editor.addEventListener('input', () => saveRichEditorSelection(editor));

        editor.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter') return;
          if (!event.target.closest('.rich-check-item') && !getActiveChecklistBlock(editor)) return;

          event.preventDefault();
          insertLineAfterChecklist(editor);
        });

        editor.addEventListener('change', (event) => {
          if (event.target.matches('input[data-rich-checklist]')) {
            syncChecklistItem(event.target);
            saveRichEditorSelection(editor);
          }
        });

        editor.addEventListener('blur', () => {
          saveRichEditorSelection(editor);
          editor.innerHTML = sanitizeRichText(editor.innerHTML);
        });

        editor.addEventListener('paste', (event) => {
          event.preventDefault();
          const text = event.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
        });
      });
    };

    return {
      getRichEditorLength,
      getRichEditorValue,
      getRichTextPlainText,
      hasRichTextMarkup,
      renderStoredRichText,
      sanitizeRichText,
      setRichEditorValue,
      setupRichTextEditors,
      syncChecklistItem,
    };
  };

  window.RichTextModule = { create };
})();
