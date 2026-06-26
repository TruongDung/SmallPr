// Rich text rendering and editor behavior shared by task modals.
(function () {
  const create = ({ escapeHtml }) => {
    const allowedTags = new Set(['A', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'UL', 'OL', 'LI', 'P', 'DIV', 'BR', 'LABEL', 'INPUT', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'CODE']);
    const editorSelections = new WeakMap();

    const hasRichTextMarkup = (value = '') => /<\/?(a|b|strong|i|em|u|s|strike|del|ul|ol|li|p|div|br|label|input|span|h[1-6]|blockquote|pre|code)\b/i.test(value);
    const isSafeLinkHref = (href = '') => /^(https?:|mailto:)/i.test(href);

    // Map an element's inline CSS (common when pasting from Word / Google Docs)
    // to the semantic tags the editor understands, so bold/italic/underline/
    // strikethrough survive the attribute-stripping pass below.
    const formatTagsFromStyle = (style = '', tagName = '') => {
      const s = style.toLowerCase();
      const tags = [];
      const fontWeight = s.match(/font-weight\s*:\s*([^;]+)/);
      if (fontWeight && /bold|[6-9]00/.test(fontWeight[1])) tags.push('b');
      if (/font-style\s*:\s*italic/.test(s)) tags.push('i');
      const decorations = (s.match(/text-decoration[^:]*:\s*[^;]+/g) || []).join(' ');
      if (/underline/.test(decorations)) tags.push('u');
      if (/line-through/.test(decorations)) tags.push('s');
      // Word marks bold runs with <b>/<strong>; don't double-wrap the same tag.
      return tags.filter((tag) => tag.toUpperCase() !== tagName);
    };

    const wrapChildrenIn = (element, tagNames) => {
      if (!tagNames.length || !element.childNodes.length) return;
      let node = document.createElement(tagNames[0]);
      node.append(...element.childNodes);
      for (let i = 1; i < tagNames.length; i += 1) {
        const outer = document.createElement(tagNames[i]);
        outer.append(node);
        node = outer;
      }
      element.append(node);
    };

    const autolinkPlainUrls = (html = '') => html.replace(
      /(^|[\s>])((https?:\/\/)[^\s<]+)/gi,
      (match, prefix, url) => `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );

    const linkifyPlainText = (value = '') => autolinkPlainUrls(escapeHtml(value)).replace(/\n/g, '<br>');

    const sanitizeRichText = (html = '') => {
      const template = document.createElement('template');
      template.innerHTML = autolinkPlainUrls(html);

      // Remove non-content nodes that Word/Office and browsers inject into the
      // clipboard HTML. If left in, <style>/<xml> text would leak as visible
      // text once their (disallowed) tags get unwrapped. Best-effort: never let
      // cleanup throw, since sanitize feeds both saving and rendering.
      try {
        template.content
          .querySelectorAll('style, script, meta, link, title, head, xml, noscript')
          .forEach((node) => node.remove());
        // Strip clipboard fragment markers and Office conditional comments.
        const commentWalker = document.createTreeWalker(template.content, NodeFilter.SHOW_COMMENT);
        const comments = [];
        while (commentWalker.nextNode()) comments.push(commentWalker.currentNode);
        comments.forEach((comment) => comment.remove());
      } catch (_error) {
        /* best-effort cleanup */
      }

      template.content.querySelectorAll('*').forEach((element) => {
        // Drop namespaced Office tags (e.g. <o:p>) entirely. Done here instead
        // of via an escaped CSS selector, which can throw in some engines.
        if (element.tagName.includes(':')) {
          element.remove();
          return;
        }

        const style = element.getAttribute('style') || '';

        // Promote inline-style formatting to semantic tags before attributes
        // are stripped (handles Word's <span style="font-weight:700"> etc.).
        wrapChildrenIn(element, formatTagsFromStyle(style, element.tagName));

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
      // Convert block elements and <br> to newlines before extracting text
      container.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
      container.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre').forEach((el) => {
        // Add newline before block element content (unless it's the first element)
        if (el.previousSibling) {
          el.before('\n');
        }
      });
      // Normalize multiple newlines and trim
      return container.textContent
        .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
        .trim();
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
      const notifyEditorInput = (editor) => {
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatSet' }));
      };

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
            notifyEditorInput(editor);
            return;
          }
          document.execCommand(button.dataset.command, false, null);
          saveRichEditorSelection(editor);
          notifyEditorInput(editor);
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
          notifyEditorInput(editor);
        });

        editor.addEventListener('change', (event) => {
          if (event.target.matches('input[data-rich-checklist]')) {
            syncChecklistItem(event.target);
            saveRichEditorSelection(editor);
            notifyEditorInput(editor);
          }
        });

        editor.addEventListener('blur', () => {
          saveRichEditorSelection(editor);
          editor.innerHTML = sanitizeRichText(editor.innerHTML);
        });

        editor.addEventListener('paste', (event) => {
          event.preventDefault();
          // Prefer the clipboard's rich HTML so formatting from Word / Google
          // Docs / web pages is preserved, then sanitize it down to the editor's
          // supported tags. Fall back to plain text when no HTML is available.
          const html = event.clipboardData?.getData('text/html') || '';
          const text = event.clipboardData?.getData('text/plain') || '';
          const cleanHtml = html.trim() ? sanitizeRichText(html) : '';

          if (cleanHtml) {
            document.execCommand('insertHTML', false, cleanHtml);
          } else {
            document.execCommand('insertText', false, text);
          }
          saveRichEditorSelection(editor);
          notifyEditorInput(editor);
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
