// Threaded comments for the task detail (preview) modal.
// Supports listing, adding, editing, and deleting multiple comments per task.
// The composer is reused for both "add" and "edit" modes so its formatting
// toolbar (wired once by setupRichTextEditors) works in every case.
(function () {
  const MAX_COMMENT_LENGTH = 10000;

  const create = ({
    request,
    t,
    getCurrentUser,
    getLanguage,
    renderStoredRichText,
    getRichEditorValue,
    setRichEditorValue,
    getRichTextPlainText,
    openRichTextLinksWithModifier,
    escapeHtml,
    showStatusToast,
  }) => {
    const listEl = document.getElementById('preview-task-comments');
    const inputEl = document.getElementById('new-task-comment-input');
    const addBtn = document.getElementById('add-task-comment');
    const cancelBtn = document.getElementById('cancel-edit-task-comment');
    const errorEl = document.getElementById('new-task-comment-error');

    let taskId = null;
    let comments = [];
    let editingId = null;
    let pendingDeleteId = null;

    const getInitials = (name) => {
      const words = String(name || '').trim().split(/\s+/).filter(Boolean);
      const initials = words.length > 1
        ? `${words[0][0]}${words[words.length - 1][0]}`
        : String(words[0] || 'U').slice(0, 2);
      return initials.toUpperCase();
    };

    const formatWhen = (iso) => {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return '';
      const diffMs = Date.now() - date.getTime();
      const mins = Math.round(diffMs / 60000);
      if (mins < 1) return t('commentJustNow') || 'just now';
      if (mins < 60) return t('commentMinutesAgo', { n: mins }) || `${mins}m ago`;
      const hrs = Math.round(mins / 60);
      if (hrs < 24) return t('commentHoursAgo', { n: hrs }) || `${hrs}h ago`;
      const days = Math.round(hrs / 24);
      if (days < 7) return t('commentDaysAgo', { n: days }) || `${days}d ago`;
      try {
        return date.toLocaleDateString(getLanguage?.() || undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
        });
      } catch {
        return date.toLocaleDateString();
      }
    };

    const showError = (message) => {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    };

    const clearError = () => {
      if (!errorEl) return;
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    };

    const isOwnComment = (comment) => {
      const user = getCurrentUser?.();
      return user && Number(user.id) === Number(comment.user_id);
    };

    const exitEditMode = () => {
      editingId = null;
      setRichEditorValue(inputEl, '');
      cancelBtn?.classList.add('hidden');
      addBtn?.setAttribute('aria-label', t('addComment') || 'Add comment');
      addBtn?.setAttribute('title', t('addComment') || 'Add comment');
      if (addBtn) addBtn.textContent = '➤';
    };

    const enterEditMode = (comment) => {
      editingId = comment.id;
      pendingDeleteId = null;
      setRichEditorValue(inputEl, comment.body || '');
      cancelBtn?.classList.remove('hidden');
      addBtn?.setAttribute('aria-label', t('saveComment') || 'Save');
      addBtn?.setAttribute('title', t('saveComment') || 'Save');
      if (addBtn) addBtn.textContent = '✓';
      clearError();
      inputEl?.focus();
      render();
    };

    const buildActions = (comment) => {
      const actions = document.createElement('div');
      actions.className = 'task-comment-actions';

      if (pendingDeleteId === comment.id) {
        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = 'task-action-icon danger';
        confirmBtn.textContent = '✓';
        confirmBtn.setAttribute('aria-label', t('confirm') || 'Confirm');
        confirmBtn.title = t('confirm') || 'Confirm';
        confirmBtn.addEventListener('click', () => remove(comment.id));

        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'task-action-icon secondary';
        cancel.textContent = '✕';
        cancel.setAttribute('aria-label', t('cancel') || 'Cancel');
        cancel.title = t('cancel') || 'Cancel';
        cancel.addEventListener('click', () => { pendingDeleteId = null; render(); });

        actions.append(confirmBtn, cancel);
        return actions;
      }

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'task-action-icon secondary';
      editBtn.textContent = '✎';
      editBtn.setAttribute('aria-label', t('edit') || 'Edit');
      editBtn.title = t('edit') || 'Edit';
      editBtn.addEventListener('click', () => enterEditMode(comment));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'task-action-icon danger';
      deleteBtn.textContent = '×';
      deleteBtn.setAttribute('aria-label', t('delete') || 'Delete');
      deleteBtn.title = t('delete') || 'Delete';
      deleteBtn.addEventListener('click', () => { pendingDeleteId = comment.id; render(); });

      actions.append(editBtn, deleteBtn);
      return actions;
    };

    const renderItem = (comment) => {
      const item = document.createElement('article');
      item.className = 'task-comment';
      item.dataset.commentId = comment.id;
      if (editingId === comment.id) item.classList.add('task-comment-editing');

      const avatar = document.createElement('div');
      avatar.className = 'task-comment-avatar';
      avatar.textContent = getInitials(comment.author_name || comment.author_username);

      const main = document.createElement('div');
      main.className = 'task-comment-main';

      const head = document.createElement('div');
      head.className = 'task-comment-head';

      const author = document.createElement('strong');
      author.className = 'task-comment-author';
      author.textContent = comment.author_name || comment.author_username || t('notAvailable') || 'User';

      const when = document.createElement('span');
      when.className = 'task-comment-when';
      when.textContent = formatWhen(comment.created_at);

      head.append(author, when);

      if (comment.updated_at && comment.updated_at !== comment.created_at) {
        const edited = document.createElement('span');
        edited.className = 'task-comment-edited';
        edited.textContent = t('commentEdited') || '(edited)';
        head.append(edited);
      }

      const body = document.createElement('div');
      body.className = 'task-comment-body';
      body.innerHTML = renderStoredRichText(comment.body || '');
      openRichTextLinksWithModifier(body);

      main.append(head, body);

      if (isOwnComment(comment)) {
        main.append(buildActions(comment));
      }

      item.append(avatar, main);
      return item;
    };

    const render = () => {
      if (!listEl) return;
      listEl.innerHTML = '';

      if (!comments.length) {
        const empty = document.createElement('p');
        empty.className = 'task-comments-empty';
        empty.textContent = t('noCommentsYet') || 'No comments yet.';
        listEl.append(empty);
        return;
      }

      comments.forEach((comment) => listEl.append(renderItem(comment)));
    };

    const load = async (task) => {
      taskId = task?.id || null;
      comments = Array.isArray(task?.comments) ? task.comments : [];
      editingId = null;
      pendingDeleteId = null;
      clearError();
      render();
      if (!taskId) return;

      const result = await request(`/api/tasks/${taskId}/comments`);
      // Guard against the modal switching tasks while the request was in flight.
      if (taskId !== (task?.id)) return;
      if (!result?.error && Array.isArray(result.comments)) {
        comments = result.comments;
        render();
      }
    };

    const submit = async () => {
      if (!taskId) return;
      const body = getRichEditorValue(inputEl);
      const plain = getRichTextPlainText(body).trim();

      if (!plain) {
        showError(t('commentEmpty') || 'Comment cannot be empty');
        return;
      }
      if (getRichTextPlainText(body).length > MAX_COMMENT_LENGTH) {
        showError(t('commentTooLong') || `Comment must be ${MAX_COMMENT_LENGTH} characters or less`);
        return;
      }

      clearError();
      if (addBtn) addBtn.disabled = true;

      const editingTarget = editingId;
      const result = editingTarget
        ? await request(`/api/tasks/${taskId}/comments/${editingTarget}`, {
          method: 'PUT',
          body: JSON.stringify({ body }),
        })
        : await request(`/api/tasks/${taskId}/comments`, {
          method: 'POST',
          body: JSON.stringify({ body }),
        });

      if (addBtn) addBtn.disabled = false;

      if (result?.error) {
        showError(result.error);
        return;
      }

      if (editingTarget) {
        comments = comments.map((comment) => (
          comment.id === result.comment.id ? result.comment : comment
        ));
        exitEditMode();
        if (typeof showStatusToast === 'function') showStatusToast(t('commentUpdated') || 'Comment updated', 'success');
      } else {
        comments.push(result.comment);
        setRichEditorValue(inputEl, '');
        if (typeof showStatusToast === 'function') showStatusToast(t('commentAdded') || 'Comment added', 'success');
      }
      render();
    };

    const remove = async (commentId) => {
      if (!taskId) return;
      const result = await request(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (result?.error) {
        showError(result.error);
        return;
      }
      comments = comments.filter((comment) => comment.id !== commentId);
      if (editingId === commentId) exitEditMode();
      pendingDeleteId = null;
      render();
      if (typeof showStatusToast === 'function') showStatusToast(t('commentDeleted') || 'Comment deleted', 'success');
    };

    const reset = () => {
      taskId = null;
      comments = [];
      pendingDeleteId = null;
      exitEditMode();
      clearError();
      if (listEl) listEl.innerHTML = '';
    };

    // Re-fetch comments when a realtime event arrives for the open task.
    const handleRealtime = (payload) => {
      if (!taskId || !payload || Number(payload.taskId) !== Number(taskId)) return;
      request(`/api/tasks/${taskId}/comments`).then((result) => {
        if (!result?.error && Array.isArray(result.comments)) {
          comments = result.comments;
          render();
        }
      }).catch(() => {});
    };

    const bind = () => {
      addBtn?.addEventListener('click', submit);
      cancelBtn?.addEventListener('click', () => { exitEditMode(); render(); });
      inputEl?.addEventListener('input', clearError);
      if (window.realtimeSocket) {
        window.realtimeSocket.on('task:comment-updated', handleRealtime);
      }
    };

    const applyTranslations = () => {
      const title = document.querySelector('[data-comments-title]');
      if (title) title.textContent = t('comments') || 'Comments';
      inputEl?.setAttribute('data-placeholder', t('commentPlaceholder') || '');
      if (!editingId) {
        addBtn?.setAttribute('aria-label', t('addComment') || 'Add comment');
        addBtn?.setAttribute('title', t('addComment') || 'Add comment');
      }
      cancelBtn?.setAttribute('aria-label', t('cancel') || 'Cancel');
      cancelBtn?.setAttribute('title', t('cancel') || 'Cancel');
      render();
    };

    return { load, reset, bind, applyTranslations, render };
  };

  window.TaskCommentsModule = { create };
}());
