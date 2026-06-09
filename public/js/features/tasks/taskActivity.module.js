// Task detail activity feed used by the task preview modal.
(function () {
  const parseSnapshot = (snapshot) => {
    if (!snapshot) return null;
    if (typeof snapshot === 'object') return snapshot;
    try {
      return JSON.parse(snapshot);
    } catch {
      return null;
    }
  };

  const create = ({
    elements,
    getCurrentUser,
    getTask,
    t,
    taskStatus,
    statusLabel,
    formatLocalDateTime,
    getRichTextPlainText,
    renderStoredRichText,
    openRichTextLinksWithModifier,
    escapeHtml,
    renderRelatedTasks,
  }) => {
    let activeFilter = 'all';

    const getActor = () => {
      const currentUser = getCurrentUser();
      return currentUser?.name || currentUser?.username || 'User';
    };

    const getInitials = (name) => {
      const words = String(name || '').trim().split(/\s+/).filter(Boolean);
      const initials = words.length > 1
        ? `${words[0][0]}${words[words.length - 1][0]}`
        : String(words[0] || 'U').slice(0, 2);
      return initials.toUpperCase();
    };

    const formatWhen = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const days = Math.round((startOfToday - startOfDate) / 86400000);
      if (days === 0) return t('today');
      if (days === 1) return t('yesterday');
      if (days > 1 && days < 7) return t('daysAgo', { count: days });
      return formatLocalDateTime(value);
    };

    const formatWorkLogDuration = (minutes) => {
      const total = Number(minutes) || 0;
      const hours = Math.floor(total / 60);
      const remainingMinutes = total % 60;
      if (hours && remainingMinutes) return `${hours}h ${remainingMinutes}m`;
      if (hours) return `${hours}h`;
      return `${remainingMinutes}m`;
    };

    const getStatusHistoryItems = (task, fallbackActor) => {
      const history = Array.isArray(task?.activity_history) ? task.activity_history : [];
      return history
        .map((entry) => {
          const before = parseSnapshot(entry.before);
          const after = parseSnapshot(entry.after);
          const fromStatus = before?.status;
          const toStatus = after?.status;
          if (entry.action !== 'edit' || !fromStatus || !toStatus || fromStatus === toStatus) return null;

          return {
            type: 'history',
            actor: entry.actor || fallbackActor,
            timestamp: entry.created_at,
            when: formatWhen(entry.created_at),
            message: t('activityChangedStatus'),
            badge: t('activityHistory'),
            diff: {
              from: statusLabel(fromStatus).toUpperCase(),
              to: statusLabel(toStatus).toUpperCase(),
            },
          };
        })
        .filter(Boolean);
    };

    const getItems = (task) => {
      if (!task) return [];
      const actor = getActor();
      const createdAt = task.created_at || task.createdAt;
      const updatedAt = task.updated_at || task.updatedAt;
      const items = [];

      if (createdAt) {
        items.push({
          type: 'history',
          actor,
          timestamp: createdAt,
          when: formatWhen(createdAt),
          message: t('activityCreatedWorkItem'),
          badge: t('activityHistory'),
        });
      }

      const statusHistoryItems = getStatusHistoryItems(task, actor);
      if (statusHistoryItems.length) {
        items.push(...statusHistoryItems);
      } else if (updatedAt && updatedAt !== createdAt && taskStatus(task) !== 'todo') {
        // Only synthesize a status-change entry when the current status differs
        // from the default ("todo"). Otherwise a non-status edit (e.g. editing
        // the description) would render a misleading "TODO -> TODO" change.
        items.push({
          type: 'history',
          actor,
          timestamp: updatedAt,
          when: formatWhen(updatedAt),
          message: t('activityChangedStatus'),
          badge: t('activityHistory'),
          diff: {
            from: t('todo').toUpperCase(),
            to: statusLabel(taskStatus(task)).toUpperCase(),
          },
        });
      }

      if (task.comment && getRichTextPlainText(task.comment).trim()) {
        items.push({
          type: 'comments',
          actor,
          timestamp: updatedAt || createdAt,
          when: formatWhen(updatedAt || createdAt),
          message: t('activityCommented'),
          badge: t('activityComment'),
          html: renderStoredRichText(task.comment),
        });
      }

      if (Number(task.time_spent_minutes) > 0) {
        items.push({
          type: 'worklog',
          actor,
          timestamp: updatedAt || createdAt,
          when: formatWhen(updatedAt || createdAt),
          message: t('activityLoggedWork', { duration: formatWorkLogDuration(task.time_spent_minutes) }),
          badge: t('activityWorkLog'),
        });
      }

      return items.sort((a, b) => {
        const aTime = new Date(a.timestamp || 0).getTime();
        const bTime = new Date(b.timestamp || 0).getTime();
        return aTime - bTime;
      });
    };

    const applyTranslations = () => {
      if (elements.title) {
        const label = elements.title.querySelector('[data-activity-title-label]');
        if (label) label.textContent = t('activity');
      }
      if (elements.toggle) elements.toggle.title = t('activity');
      elements.tabs.forEach((button) => {
        const filter = button.dataset.activityFilter;
        const labels = {
          all: t('activityAll'),
          comments: t('activityComments'),
          history: t('activityHistoryTab'),
          related: t('relatedTasks'),
        };
        button.textContent = labels[filter] || button.textContent;
      });
    };

    const render = () => {
      if (!elements.list) return;

      // Toggle visibility between activity list and related tasks panel
      const isRelatedTab = activeFilter === 'related';
      elements.list.classList.toggle('hidden', isRelatedTab);
      if (elements.relatedPanel) {
        elements.relatedPanel.classList.toggle('hidden', !isRelatedTab);
      }

      elements.tabs.forEach((tab) => {
        const isActive = tab.dataset.activityFilter === activeFilter;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });

      // If showing related tab, render related tasks and return
      if (isRelatedTab) {
        if (typeof renderRelatedTasks === 'function') {
          renderRelatedTasks();
        }
        return;
      }

      const items = getItems(getTask())
        .filter((item) => activeFilter === 'all' || item.type === activeFilter);

      elements.list.innerHTML = '';

      if (!items.length) {
        const empty = document.createElement('p');
        empty.className = 'task-activity-empty';
        empty.textContent = t('activityEmpty');
        elements.list.append(empty);
        return;
      }

      items.forEach((item) => {
        const entry = document.createElement('article');
        entry.className = `task-activity-item task-activity-${item.type}`;

        const avatar = document.createElement('div');
        avatar.className = 'task-activity-avatar';
        avatar.textContent = getInitials(item.actor);

        const body = document.createElement('div');
        body.className = 'task-activity-body';

        const message = document.createElement('p');
        message.className = 'task-activity-message';
        const actor = document.createElement('strong');
        actor.textContent = item.actor;
        message.append(actor, ` ${item.message}`);

        const when = document.createElement('p');
        when.className = 'task-activity-when';
        when.textContent = item.when;

        const badge = document.createElement('span');
        badge.className = 'task-activity-badge';
        badge.textContent = item.badge;

        const meta = document.createElement('div');
        meta.className = 'task-activity-meta';
        meta.append(when, badge);

        body.append(message, meta);

        if (item.diff) {
          const diff = document.createElement('div');
          diff.className = 'task-activity-diff';
          diff.innerHTML = `<span>${escapeHtml(item.diff.from)}</span><span aria-hidden="true">→</span><span>${escapeHtml(item.diff.to)}</span>`;
          body.append(diff);
        }

        if (item.html) {
          const comment = document.createElement('div');
          comment.className = 'task-activity-comment';
          comment.innerHTML = item.html;
          openRichTextLinksWithModifier(comment);
          body.append(comment);
        }

        entry.append(avatar, body);
        elements.list.append(entry);
      });
    };

    const setExpanded = (expanded) => {
      if (!elements.toggle || !elements.content) return;
      elements.content.classList.toggle('hidden', !expanded);
      elements.toggle.setAttribute('aria-expanded', String(expanded));
      elements.toggle.classList.toggle('collapsed', !expanded);
    };

    const bind = () => {
      elements.tabs.forEach((button) => {
        button.addEventListener('click', () => {
          activeFilter = button.dataset.activityFilter || 'all';
          render();
        });
      });

      elements.toggle?.addEventListener('click', () => {
        const expanded = elements.toggle.getAttribute('aria-expanded') !== 'false';
        setExpanded(!expanded);
      });
    };

    const reset = () => {
      activeFilter = 'all';
      setExpanded(true);
      if (elements.list) elements.list.innerHTML = '';
    };

    return {
      applyTranslations,
      bind,
      render,
      reset,
      setExpanded,
    };
  };

  window.TaskActivityModule = { create };
})();
