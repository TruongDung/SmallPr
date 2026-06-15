// Dashboard / Today View module.
//
// Mirrors the existing creditCards/notes module shape (factory returning
// { applyTranslations, bind, load, refresh }). The dashboard renders one
// landing view that aggregates Tasks, Notes, Bills, Credit Cards, Weather,
// and the Daily Quote in 7 cards from a single GET /api/dashboard fetch.
// Realtime: subscribes to the existing window.realtimeSocket and debounces
// refetches at 150ms.
(function () {
  const CARD_DEFINITIONS = [
    { id: 'todaysTasks',       titleKey: 'cardTodaysTasks',       canHide: true },
    { id: 'activeSprints',     titleKey: 'cardActiveSprints',     canHide: true },
    { id: 'taskStatusSummary', titleKey: 'cardTaskStatusSummary', canHide: true },
    { id: 'bills',             titleKey: 'cardBills',             canHide: true },
    { id: 'creditCards',       titleKey: 'cardCreditCards',       canHide: true },
    { id: 'recentNotes',       titleKey: 'cardRecentNotes',       canHide: true },
    { id: 'weather',           titleKey: 'cardWeather',           canHide: true },
    { id: 'dailyQuote',        titleKey: 'cardDailyQuote',        canHide: true },
  ];
  const CARD_BY_ID = Object.fromEntries(CARD_DEFINITIONS.map((c) => [c.id, c]));
  const REFRESH_DEBOUNCE_MS = 150;

  const create = (deps) => {
    const {
      request,
      t,
      getLanguage = () => 'en',
      getTimezone = null,
      showStatusToast = () => {},
      openAddTask = () => {},
      openNewNote = () => {},
      navigateTo = () => {},
      onLoaded = () => {},
    } = deps;

    const root = document.getElementById('dashboard-section');
    if (!root) {
      // Defensive: section missing. Return a no-op module so the rest of the
      // app still boots.
      const noop = () => {};
      return { applyTranslations: noop, bind: noop, load: noop, refresh: noop, getPreferences: () => null };
    }

    const grid = root.querySelector('#dashboard-grid');
    const liveRegion = root.querySelector('#dashboard-live-region');
    const errorBanner = root.querySelector('#dashboard-error');
    const customizeModal = document.getElementById('dashboard-customize-modal');
    const customizeList = document.getElementById('dashboard-customize-list');
    const customizeDefaultLanding = document.getElementById('dashboard-default-landing');
    const customizeSaveBtn = document.getElementById('dashboard-customize-save');
    const customizeCancelBtn = document.getElementById('dashboard-customize-cancel');
    const customizeCloseBtn = document.getElementById('dashboard-customize-close');
    const customizeResetBtn = document.getElementById('dashboard-customize-reset');
    const addTaskBtn = root.querySelector('#dashboard-add-task');
    const newNoteBtn = root.querySelector('#dashboard-new-note');
    const customizeBtn = root.querySelector('#dashboard-customize');

    let lastPayload = null;
    let lastTimezone = null;
    let refreshTimer = null;
    let listenersBound = false;
    let liveDisconnected = false;
    let dailyRolloverTimer = null;

    const announce = (msg) => {
      if (!liveRegion) return;
      liveRegion.textContent = msg || '';
    };

    const showBannerError = (message) => {
      if (!errorBanner) return;
      if (!message) {
        errorBanner.classList.add('hidden');
        errorBanner.innerHTML = '';
        return;
      }
      errorBanner.classList.remove('hidden');
      errorBanner.innerHTML = '';
      const text = document.createElement('span');
      text.textContent = message;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'task-action-icon secondary';
      retry.textContent = '↻';
      retry.setAttribute('aria-label', t('dashboardRetry'));
      retry.title = t('dashboardRetry');
      retry.addEventListener('click', () => load({ silent: false }));
      errorBanner.append(text, retry);
    };

    // --- Helpers ----------------------------------------------------------

    const locale = () => (getLanguage() === 'vi' ? 'vi-VN' : 'en-US');
    const tz = () => {
      const configuredTimezone = typeof getTimezone === 'function' ? getTimezone() : '';
      if (configuredTimezone) return configuredTimezone;
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      } catch (_e) {
        return 'UTC';
      }
    };

    const formatNumber = (n) => {
      try {
        return new Intl.NumberFormat(locale()).format(Number(n) || 0);
      } catch (_e) {
        return String(n);
      }
    };

    const formatCurrency = (value) => {
      const num = Number(value) || 0;
      try {
        return new Intl.NumberFormat(locale(), {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num);
      } catch (_e) {
        return num.toFixed(2);
      }
    };

    const formatRelativeTime = (iso) => {
      if (!iso) return '';
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return '';
      const diffMs = Date.now() - date.getTime();
      const diffSec = Math.round(diffMs / 1000);
      const absSec = Math.abs(diffSec);
      const sign = diffSec >= 0 ? -1 : 1; // negative: in the past for RelativeTimeFormat
      try {
        const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
        if (absSec < 60) return rtf.format(sign * absSec, 'second');
        const min = Math.round(absSec / 60);
        if (min < 60) return rtf.format(sign * min, 'minute');
        const hr = Math.round(min / 60);
        if (hr < 24) return rtf.format(sign * hr, 'hour');
        const day = Math.round(hr / 24);
        if (day < 30) return rtf.format(sign * day, 'day');
        const month = Math.round(day / 30);
        if (month < 12) return rtf.format(sign * month, 'month');
        return rtf.format(sign * Math.round(month / 12), 'year');
      } catch (_e) {
        return new Date(iso).toLocaleDateString(locale());
      }
    };

    const formatDateTime = (iso) => {
      if (!iso) return '';
      try {
        return new Date(iso).toLocaleString(locale(), {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: lastTimezone || tz(),
        });
      } catch (_e) {
        return new Date(iso).toLocaleString();
      }
    };

    const formatShortDate = (ymd) => {
      if (!ymd) return '';
      // Treat "YYYY-MM-DD" as a local-day stamp so we don't shift it through tz.
      const [y, m, d] = String(ymd).split('-').map(Number);
      if (!y) return ymd;
      const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
      try {
        return date.toLocaleDateString(locale(), { month: 'short', day: 'numeric', timeZone: 'UTC' });
      } catch (_e) {
        return ymd;
      }
    };

    const escapeHtml = (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // --- Card renderers ---------------------------------------------------

    const cardShell = (id) => {
      const def = CARD_BY_ID[id];
      const section = document.createElement('section');
      section.className = 'dashboard-card';
      section.dataset.card = id;
      section.setAttribute('role', 'region');
      const titleId = `dashboard-card-${id}-title`;
      section.setAttribute('aria-labelledby', titleId);
      const header = document.createElement('div');
      header.className = 'dashboard-card-header';
      const heading = document.createElement('h3');
      heading.id = titleId;
      heading.className = 'dashboard-card-title';
      heading.textContent = t(def.titleKey);
      header.append(heading);
      section.append(header);
      return { section, header };
    };

    const renderCardError = ({ section }, retry) => {
      const body = document.createElement('div');
      body.className = 'dashboard-card-body';
      const err = document.createElement('div');
      err.className = 'dashboard-error';
      err.textContent = t('cardErrorRetry');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'task-action-icon secondary';
      btn.textContent = '↻';
      btn.setAttribute('aria-label', t('dashboardRetry'));
      btn.title = t('dashboardRetry');
      if (typeof retry === 'function') btn.addEventListener('click', retry);
      err.append(btn);
      body.append(err);
      section.append(body);
    };

    const renderEmpty = (section, message, action) => {
      const body = document.createElement('div');
      body.className = 'dashboard-card-body';
      const empty = document.createElement('div');
      empty.className = 'dashboard-empty';
      const text = document.createElement('p');
      text.textContent = message;
      empty.append(text);
      if (action) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dashboard-quick-action';
        btn.textContent = action.label;
        btn.addEventListener('click', action.onClick);
        empty.append(btn);
      }
      body.append(empty);
      section.append(body);
    };

    const renderTodaysTasksCard = (data) => {
      const shell = cardShell('todaysTasks');
      const { section, header } = shell;

      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'dashboard-link';
      link.textContent = t('viewAllTasks');
      link.addEventListener('click', () => navigateTo({ view: 'tasks' }));
      header.append(link);

      const total = (data.overdue?.length || 0) + (data.today?.length || 0) + (data.in_progress?.length || 0);
      if (!total) {
        renderEmpty(section, t('dashboardEmptyTasks'), {
          label: t('quickAddTask'),
          onClick: () => openAddTask(),
        });
        return section;
      }

      const body = document.createElement('div');
      body.className = 'dashboard-card-body';

      const buildSubsection = (titleKey, rows) => {
        if (!rows || !rows.length) return null;
        const wrap = document.createElement('div');
        wrap.className = 'dashboard-task-subsection';
        const subtitle = document.createElement('p');
        subtitle.className = 'dashboard-subsection-title';
        subtitle.textContent = t(titleKey);
        wrap.append(subtitle);
        const list = document.createElement('ul');
        list.className = 'dashboard-task-list';
        list.setAttribute('role', 'list');
        for (const row of rows) {
          const li = document.createElement('li');
          li.className = 'dashboard-task-row';
          li.dataset.status = row.status;
          li.dataset.priority = row.priority;
          const title = document.createElement('span');
          title.className = 'dashboard-task-title';
          title.textContent = row.title;
          const meta = document.createElement('span');
          meta.className = 'dashboard-task-meta';
          const metaParts = [];
          metaParts.push(t(row.priority || 'medium'));
          if (row.tag) metaParts.push(`#${row.tag}`);
          if (row.reminder_at) metaParts.push(formatDateTime(row.reminder_at));
          meta.textContent = metaParts.join(' • ');
          const doneBtn = document.createElement('button');
          doneBtn.type = 'button';
          doneBtn.className = 'task-action-icon secondary dashboard-task-done';
          doneBtn.textContent = '✓';
          doneBtn.setAttribute('aria-label', t('markDone'));
          doneBtn.title = t('markDone');
          doneBtn.addEventListener('click', async (event) => {
            event.stopPropagation();
            const result = await request(`/api/tasks/${row.id}`, {
              method: 'PUT',
              body: JSON.stringify({ status: 'done' }),
            });
            if (result && !result.error) {
              showStatusToast(t('taskMarkedDone'), 'success');
              announce(t('taskMarkedDone'));
              load({ silent: true });
            }
          });
          li.append(title, meta, doneBtn);
          li.addEventListener('click', () => navigateTo({ view: 'tasks', taskId: row.id }));
          list.append(li);
        }
        wrap.append(list);
        return wrap;
      };

      const overdue = buildSubsection('subOverdue', data.overdue);
      const today   = buildSubsection('subToday',   data.today);
      const inProg  = buildSubsection('subInProgress', data.in_progress);
      [overdue, today, inProg].filter(Boolean).forEach((node) => body.append(node));
      section.append(body);
      return section;
    };

    const renderTaskStatusCard = (data) => {
      const shell = cardShell('taskStatusSummary');
      const total = (data.todo || 0) + (data.in_progress || 0) + (data.done || 0);
      if (!total) {
        renderEmpty(shell.section, t('dashboardEmptyTasks'), {
          label: t('quickAddTask'),
          onClick: () => openAddTask(),
        });
        return shell.section;
      }
      const body = document.createElement('div');
      body.className = 'dashboard-card-body dashboard-status-grid';
      const cells = [
        { status: 'todo',        label: t('todo'),       count: data.todo },
        { status: 'in_progress', label: t('in_progress'), count: data.in_progress },
        { status: 'done',        label: t('done'),       count: data.done },
      ];
      for (const cell of cells) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dashboard-status-cell';
        button.dataset.status = cell.status;
        button.setAttribute('aria-label', `${cell.label}: ${formatNumber(cell.count)}`);
        const value = document.createElement('span');
        value.className = 'dashboard-status-count';
        value.textContent = formatNumber(cell.count);
        const label = document.createElement('span');
        label.className = 'dashboard-status-label';
        label.textContent = cell.label;
        button.append(value, label);
        button.addEventListener('click', () => navigateTo({ view: 'tasks', statusFilter: cell.status }));
        body.append(button);
      }
      shell.section.append(body);
      return shell.section;
    };

    const renderRecentNotesCard = (data) => {
      const shell = cardShell('recentNotes');
      const { section, header } = shell;
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'dashboard-link';
      link.textContent = t('viewAllNotes');
      link.addEventListener('click', () => navigateTo({ view: 'notes' }));
      header.append(link);
      if (!data || !data.length) {
        renderEmpty(section, t('dashboardEmptyNotes'), {
          label: t('quickNewNote'),
          onClick: () => openNewNote(),
        });
        return section;
      }
      const body = document.createElement('div');
      body.className = 'dashboard-card-body';
      const list = document.createElement('ul');
      list.className = 'dashboard-note-list';
      list.setAttribute('role', 'list');
      for (const note of data) {
        const li = document.createElement('li');
        li.className = 'dashboard-note-row';
        const title = document.createElement('span');
        title.className = 'dashboard-note-title';
        title.textContent = note.title || t('untitledNote');
        const excerpt = document.createElement('span');
        excerpt.className = 'dashboard-note-excerpt';
        excerpt.textContent = note.excerpt || '';
        const time = document.createElement('span');
        time.className = 'dashboard-note-time';
        time.textContent = formatRelativeTime(note.updated_at);
        li.append(title, excerpt, time);
        li.addEventListener('click', () => navigateTo({ view: 'notes', noteId: note.id }));
        list.append(li);
      }
      body.append(list);
      section.append(body);
      return section;
    };

    const renderBillsCard = (data) => {
      const shell = cardShell('bills');
      const { section, header } = shell;
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'dashboard-link';
      link.textContent = t('viewAllBills');
      link.addEventListener('click', () => navigateTo({ view: 'credit-cards', tab: 'bills' }));
      header.append(link);

      const total = (data.overdue?.length || 0) + (data.dueSoon?.length || 0) + (data.undated?.length || 0);
      if (!total) {
        renderEmpty(section, t('dashboardEmptyBills'));
        return section;
      }

      const body = document.createElement('div');
      body.className = 'dashboard-card-body';

      const buildBillSubsection = (titleKey, rows) => {
        if (!rows || !rows.length) return null;
        const wrap = document.createElement('div');
        wrap.className = 'dashboard-bill-subsection';
        const subtitle = document.createElement('p');
        subtitle.className = 'dashboard-subsection-title';
        subtitle.textContent = t(titleKey);
        wrap.append(subtitle);
        const list = document.createElement('ul');
        list.className = 'dashboard-bill-list';
        list.setAttribute('role', 'list');
        for (const bill of rows) {
          const li = document.createElement('li');
          li.className = 'dashboard-bill-row';
          const item = document.createElement('span');
          item.className = 'dashboard-bill-item';
          item.textContent = bill.item;
          const amount = document.createElement('span');
          amount.className = 'dashboard-bill-amount';
          amount.textContent = formatCurrency(bill.amount);
          const meta = document.createElement('span');
          meta.className = 'dashboard-bill-meta';
          const metaParts = [];
          if (bill.due_date) metaParts.push(formatShortDate(bill.due_date));
          if (bill.pay_before) metaParts.push(bill.pay_before);
          meta.textContent = metaParts.join(' • ');
          const payBtn = document.createElement('button');
          payBtn.type = 'button';
          payBtn.className = 'task-action-icon secondary';
          payBtn.textContent = '✓';
          payBtn.setAttribute('aria-label', t('markPaid'));
          payBtn.title = t('markPaid');
          payBtn.addEventListener('click', async (event) => {
            event.stopPropagation();
            const result = await request(`/api/credit-cards/fast-access-bills/${bill.id}`, {
              method: 'PUT',
              body: JSON.stringify({ status: 'Paid' }),
            });
            if (result && !result.error) {
              showStatusToast(t('billMarkedPaid'), 'success');
              announce(t('billMarkedPaid'));
              load({ silent: true });
            }
          });
          li.append(item, amount, meta, payBtn);
          li.addEventListener('click', () => navigateTo({ view: 'credit-cards', tab: 'bills', billId: bill.id }));
          list.append(li);
        }
        wrap.append(list);
        return wrap;
      };

      const overdue = buildBillSubsection('subOverdue',  data.overdue);
      const dueSoon = buildBillSubsection('subDueSoon',  data.dueSoon);
      const undated = buildBillSubsection('subUndated',  data.undated);
      [overdue, dueSoon, undated].filter(Boolean).forEach((node) => body.append(node));
      section.append(body);
      return section;
    };

    const renderCreditCardsCard = (data) => {
      const shell = cardShell('creditCards');
      const { section } = shell;
      if (!data || data.cardCount === 0) {
        renderEmpty(section, t('dashboardEmptyCards'));
        return section;
      }
      const body = document.createElement('div');
      body.className = 'dashboard-card-body';

      const totals = document.createElement('div');
      totals.className = 'dashboard-cc-totals';
      totals.tabIndex = 0;
      totals.setAttribute('role', 'button');
      totals.addEventListener('click', () => navigateTo({ view: 'credit-cards' }));
      totals.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateTo({ view: 'credit-cards' });
        }
      });
      const balRow = document.createElement('div');
      balRow.className = 'dashboard-cc-total-row';
      balRow.innerHTML = `<span>${escapeHtml(t('totalBalance'))}</span><strong>${formatCurrency(data.totalBalance)}</strong>`;
      const intRow = document.createElement('div');
      intRow.className = 'dashboard-cc-total-row';
      intRow.innerHTML = `<span>${escapeHtml(t('totalInterest'))}</span><strong>${formatCurrency(data.totalInterest)}</strong>`;
      totals.append(balRow, intRow);
      body.append(totals);

      if (!data.approachingClose || !data.approachingClose.length) {
        const empty = document.createElement('p');
        empty.className = 'dashboard-cc-empty';
        empty.textContent = t('dashboardNoApproachingClose');
        body.append(empty);
      } else {
        const list = document.createElement('ul');
        list.className = 'dashboard-cc-list';
        list.setAttribute('role', 'list');
        for (const card of data.approachingClose) {
          const li = document.createElement('li');
          li.className = 'dashboard-cc-row';
          const name = document.createElement('span');
          name.className = 'dashboard-cc-name';
          name.textContent = card.name;
          const amount = document.createElement('span');
          amount.className = 'dashboard-cc-amount';
          amount.textContent = formatCurrency(card.total_balance);
          const closes = document.createElement('span');
          closes.className = 'dashboard-cc-closes';
          closes.textContent = t('closesInDays', { n: card.daysUntilClose });
          li.append(name, amount, closes);
          li.addEventListener('click', () => navigateTo({ view: 'credit-cards', cardId: card.id }));
          list.append(li);
        }
        body.append(list);
      }

      section.append(body);
      return section;
    };

    const renderWeatherCard = (data) => {
      const shell = cardShell('weather');
      const { section } = shell;
      if (!data || !data.city) {
        renderEmpty(section, t('dashboardEmptyWeather'), {
          label: t('weather'),
          onClick: () => navigateTo({ view: 'weather' }),
        });
        return section;
      }
      const body = document.createElement('div');
      body.className = 'dashboard-card-body dashboard-weather-body';
      const cityRow = document.createElement('div');
      cityRow.className = 'dashboard-weather-city';
      const cityName = document.createElement('strong');
      cityName.textContent = data.city.name;
      cityRow.append(cityName);
      const meta = document.createElement('p');
      meta.className = 'dashboard-weather-meta';
      meta.textContent = t('weatherOpenInTab');
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'dashboard-link';
      link.textContent = t('weather');
      link.addEventListener('click', () => navigateTo({ view: 'weather', cityId: data.city.id }));
      body.append(cityRow, meta, link);
      section.append(body);
      return section;
    };

    const renderDailyQuoteCard = (data) => {
      const shell = cardShell('dailyQuote');
      const { section } = shell;
      const body = document.createElement('div');
      body.className = 'dashboard-card-body dashboard-quote-body';
      if (!data || !data.text) {
        renderEmpty(section, t('dashboardQuoteUnavailable'));
        return section;
      }
      const quote = document.createElement('blockquote');
      quote.className = 'dashboard-quote-text';
      quote.textContent = data.text;
      const author = document.createElement('p');
      author.className = 'dashboard-quote-author';
      author.textContent = data.author ? `— ${data.author}` : '';
      body.append(quote, author);
      section.append(body);
      return section;
    };

    const renderActiveSprintsCard = (data) => {
      const shell = cardShell('activeSprints');
      const { section, header } = shell;

      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'dashboard-link';
      link.textContent = t('viewAllSprints') || 'View all';
      link.addEventListener('click', () => navigateTo({ view: 'sprints' }));
      header.append(link);

      const sprints = data.sprints || [];
      if (!sprints.length) {
        renderEmpty(section, t('dashboardEmptySprints') || 'No active sprints.');
        return section;
      }

      const body = document.createElement('div');
      body.className = 'dashboard-card-body';
      const list = document.createElement('ul');
      list.className = 'dashboard-sprint-list';
      list.setAttribute('role', 'list');

      sprints.forEach((sprint) => {
        const li = document.createElement('li');
        li.className = 'dashboard-sprint-row';
        li.dataset.status = sprint.status;
        li.addEventListener('click', () => navigateTo({ view: 'sprints' }));

        const name = document.createElement('span');
        name.className = 'dashboard-sprint-name';
        name.textContent = sprint.name;

        const meta = document.createElement('span');
        meta.className = 'dashboard-sprint-meta';
        const percent = sprint.task_count ? Math.round((sprint.done_count / sprint.task_count) * 100) : 0;
        meta.textContent = `${sprint.done_count}/${sprint.task_count} (${percent}%)`;

        const badge = document.createElement('span');
        badge.className = `dashboard-sprint-badge dashboard-sprint-badge-${sprint.status}`;
        badge.textContent = t(`sprint_${sprint.status}`) || sprint.status;

        li.append(name, badge, meta);
        list.append(li);
      });

      body.append(list);
      section.append(body);
      return section;
    };

    const RENDERERS = {
      todaysTasks:       renderTodaysTasksCard,
      activeSprints:     renderActiveSprintsCard,
      taskStatusSummary: renderTaskStatusCard,
      recentNotes:       renderRecentNotesCard,
      bills:             renderBillsCard,
      creditCards:       renderCreditCardsCard,
      weather:           renderWeatherCard,
      dailyQuote:        renderDailyQuoteCard,
    };

    // --- Skeleton + main renderer ----------------------------------------

    const renderSkeletons = () => {
      grid.innerHTML = '';
      const order = lastPayload?.preferences?.cards?.filter((c) => c.visible)?.sort((a, b) => a.order - b.order)
        || CARD_DEFINITIONS.map((c, i) => ({ id: c.id, visible: true, order: i }));
      for (const entry of order) {
        const def = CARD_BY_ID[entry.id];
        if (!def) continue;
        const skel = document.createElement('section');
        skel.className = 'dashboard-card dashboard-card-skeleton';
        skel.dataset.card = entry.id;
        skel.setAttribute('aria-hidden', 'true');
        skel.innerHTML = `
          <div class="dashboard-card-header"><div class="dashboard-skeleton" style="width:40%;height:18px;"></div></div>
          <div class="dashboard-card-body">
            <div class="dashboard-skeleton" style="width:90%;height:14px;"></div>
            <div class="dashboard-skeleton" style="width:80%;height:14px;"></div>
            <div class="dashboard-skeleton" style="width:60%;height:14px;"></div>
          </div>
        `;
        grid.append(skel);
      }
    };

    const renderAll = (payload) => {
      grid.innerHTML = '';
      const order = (payload.preferences?.cards || [])
        .filter((c) => c.visible)
        .sort((a, b) => a.order - b.order);
      for (const entry of order) {
        const card = payload.cards?.[entry.id];
        const renderer = RENDERERS[entry.id];
        if (!renderer) continue;
        if (!card || card.ok === false) {
          const shell = cardShell(entry.id);
          renderCardError(shell, () => load({ silent: false }));
          grid.append(shell.section);
          continue;
        }
        const node = renderer(card.data);
        grid.append(node);
      }
      announce(t('dashboardUpdated'));
    };

    // --- Load + refresh ---------------------------------------------------

    const load = async ({ silent = false } = {}) => {
      if (!silent) renderSkeletons();
      try {
        const url = `/api/dashboard?tz=${encodeURIComponent(tz())}`;
        const payload = await request(url);
        if (!payload || payload.error) {
          showBannerError(t('dashboardErrorTitle'));
          return;
        }
        showBannerError(null);
        lastPayload = payload;
        lastTimezone = payload.timezone || tz();
        renderAll(payload);
        scheduleDailyQuoteRollover();
        try { onLoaded(payload); } catch (_e) {}
      } catch (_error) {
        showBannerError(t('dashboardErrorTitle'));
      }
    };

    const refresh = () => load({ silent: true });

    const scheduleRefresh = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        if (!root.classList.contains('hidden')) refresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    const scheduleDailyQuoteRollover = () => {
      if (dailyRolloverTimer) clearInterval(dailyRolloverTimer);
      // Check once per minute whether the local-day-in-tz changed since the
      // last load. If yes, fetch a fresh quote.
      let lastDay = lastPayload?.today;
      dailyRolloverTimer = setInterval(() => {
        try {
          const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: lastTimezone || tz(),
            year: 'numeric', month: '2-digit', day: '2-digit',
          }).format(new Date());
          if (today !== lastDay) {
            lastDay = today;
            refresh();
          }
        } catch (_e) {
          /* ignore */
        }
      }, 60 * 1000);
    };

    // --- Realtime ---------------------------------------------------------

    const attachRealtime = () => {
      if (listenersBound) return;
      const sock = window.realtimeSocket;
      if (!sock || typeof sock.on !== 'function') return;
      ['task:created', 'task:updated', 'task:deleted',
       'note:created', 'note:updated', 'note:deleted',
       'bill:updated', 'card:updated'].forEach((event) => sock.on(event, scheduleRefresh));
      sock.on('connect', handleConnect);
      sock.on('disconnect', handleDisconnect);
      listenersBound = true;
    };

    const detachRealtime = () => {
      const sock = window.realtimeSocket;
      if (!sock || typeof sock.off !== 'function') return;
      ['task:created', 'task:updated', 'task:deleted',
       'note:created', 'note:updated', 'note:deleted',
       'bill:updated', 'card:updated'].forEach((event) => sock.off(event, scheduleRefresh));
      sock.off('connect', handleConnect);
      sock.off('disconnect', handleDisconnect);
      listenersBound = false;
    };

    const handleConnect = () => {
      if (liveDisconnected) {
        liveDisconnected = false;
        announce(t('dashboardLiveResumed'));
        refresh();
      }
    };

    const handleDisconnect = () => {
      liveDisconnected = true;
      announce(t('dashboardLivePaused'));
    };

    // --- Customize modal --------------------------------------------------

    const renderCustomizeList = (prefs) => {
      customizeList.innerHTML = '';
      const cards = prefs.cards.slice().sort((a, b) => a.order - b.order);
      cards.forEach((entry, index) => {
        const def = CARD_BY_ID[entry.id];
        if (!def) return;
        const li = document.createElement('li');
        li.className = 'dashboard-customize-row';
        li.dataset.cardId = entry.id;

        const visible = document.createElement('input');
        visible.type = 'checkbox';
        visible.className = 'dashboard-customize-checkbox';
        visible.checked = entry.visible !== false;
        visible.setAttribute('aria-label', def.titleKey ? t(def.titleKey) : entry.id);

        const label = document.createElement('span');
        label.className = 'dashboard-customize-row-label';
        label.textContent = t(def.titleKey);

        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.className = 'task-action-icon secondary dashboard-customize-move dashboard-customize-move-up';
        upBtn.textContent = '▲';
        upBtn.setAttribute('aria-label', t('moveUp'));
        upBtn.title = t('moveUp');
        upBtn.disabled = index === 0;

        const downBtn = document.createElement('button');
        downBtn.type = 'button';
        downBtn.className = 'task-action-icon secondary dashboard-customize-move dashboard-customize-move-down';
        downBtn.textContent = '▼';
        downBtn.setAttribute('aria-label', t('moveDown'));
        downBtn.title = t('moveDown');
        downBtn.disabled = index === cards.length - 1;

        upBtn.addEventListener('click', () => {
          if (index === 0) return;
          [cards[index - 1], cards[index]] = [cards[index], cards[index - 1]];
          cards.forEach((c, i) => { c.order = i; });
          renderCustomizeList({ ...prefs, cards });
        });
        downBtn.addEventListener('click', () => {
          if (index === cards.length - 1) return;
          [cards[index + 1], cards[index]] = [cards[index], cards[index + 1]];
          cards.forEach((c, i) => { c.order = i; });
          renderCustomizeList({ ...prefs, cards });
        });
        visible.addEventListener('change', () => {
          entry.visible = visible.checked;
        });

        const moveGroup = document.createElement('div');
        moveGroup.className = 'dashboard-customize-move-group';
        moveGroup.append(upBtn, downBtn);

        li.append(visible, label, moveGroup);
        customizeList.append(li);
      });
      // Stash the in-progress prefs on the modal element so save can read it.
      customizeModal.__draftPrefs = { ...prefs, cards };
    };

    const openCustomize = () => {
      const prefs = lastPayload?.preferences ? JSON.parse(JSON.stringify(lastPayload.preferences))
                                             : { version: 1, defaultLanding: 'today', cards: CARD_DEFINITIONS.map((c, i) => ({ id: c.id, visible: true, order: i })) };
      customizeDefaultLanding.value = prefs.defaultLanding === 'last_used' ? 'last_used' : 'today';
      renderCustomizeList(prefs);
      customizeModal.classList.remove('hidden');
      // Move focus into the modal.
      setTimeout(() => {
        const first = customizeModal.querySelector('input, button, select');
        if (first) first.focus();
      }, 0);
    };

    const closeCustomize = () => {
      customizeModal.classList.add('hidden');
    };

    const saveCustomize = async () => {
      const draft = customizeModal.__draftPrefs;
      if (!draft) {
        closeCustomize();
        return;
      }
      const payload = {
        ...draft,
        defaultLanding: customizeDefaultLanding.value === 'last_used' ? 'last_used' : 'today',
      };
      const result = await request('/api/dashboard/preferences', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (result && !result.error) {
        showStatusToast(t('dashboardPreferencesSaved'), 'success');
        if (lastPayload) lastPayload.preferences = result.preferences || payload;
        closeCustomize();
        refresh();
      } else {
        showStatusToast(t('dashboardPreferencesError'), 'error');
      }
    };

    const resetCustomize = async () => {
      const result = await request('/api/dashboard/preferences/reset', { method: 'POST' });
      if (result && !result.error) {
        showStatusToast(t('dashboardPreferencesReset'), 'success');
        if (lastPayload) lastPayload.preferences = result.preferences;
        closeCustomize();
        refresh();
      } else {
        showStatusToast(t('dashboardPreferencesError'), 'error');
      }
    };

    // --- Public API -------------------------------------------------------

    const applyTranslations = () => {
      const titleEl = root.querySelector('#dashboard-title');
      if (titleEl) titleEl.textContent = t('dashboardTitle');
      if (addTaskBtn) {
        addTaskBtn.setAttribute('aria-label', t('quickAddTask'));
        addTaskBtn.title = t('quickAddTask');
      }
      if (newNoteBtn) {
        newNoteBtn.setAttribute('aria-label', t('quickNewNote'));
        newNoteBtn.title = t('quickNewNote');
      }
      if (customizeBtn) {
        customizeBtn.setAttribute('aria-label', t('dashboardCustomize'));
        customizeBtn.title = t('dashboardCustomize');
      }
      const labelEl = document.getElementById('dashboard-default-landing-label');
      if (labelEl) labelEl.textContent = t('dashboardDefaultLanding');
      if (customizeDefaultLanding) {
        const opts = customizeDefaultLanding.querySelectorAll('option');
        if (opts[0]) opts[0].textContent = t('dashboardDefaultLandingToday');
        if (opts[1]) opts[1].textContent = t('dashboardDefaultLandingLastUsed');
      }
      const customizeTitle = document.getElementById('dashboard-customize-title');
      if (customizeTitle) customizeTitle.textContent = t('dashboardCustomize');
      if (customizeResetBtn) customizeResetBtn.textContent = t('dashboardCustomizeReset');
      if (customizeSaveBtn) {
        customizeSaveBtn.setAttribute('aria-label', t('save'));
        customizeSaveBtn.title = t('save');
      }
      if (customizeCancelBtn) {
        customizeCancelBtn.setAttribute('aria-label', t('cancel'));
        customizeCancelBtn.title = t('cancel');
      }
      if (customizeCloseBtn) {
        customizeCloseBtn.setAttribute('aria-label', t('cancel'));
        customizeCloseBtn.title = t('cancel');
      }
      // Re-render content so dates/numbers/labels follow the new locale.
      if (lastPayload) renderAll(lastPayload);
    };

    const bind = () => {
      if (addTaskBtn) addTaskBtn.addEventListener('click', () => openAddTask());
      if (newNoteBtn) newNoteBtn.addEventListener('click', () => openNewNote());
      if (customizeBtn) customizeBtn.addEventListener('click', openCustomize);
      if (customizeCloseBtn) customizeCloseBtn.addEventListener('click', closeCustomize);
      if (customizeCancelBtn) customizeCancelBtn.addEventListener('click', closeCustomize);
      if (customizeSaveBtn) customizeSaveBtn.addEventListener('click', saveCustomize);
      if (customizeResetBtn) customizeResetBtn.addEventListener('click', resetCustomize);
      // Esc closes customize modal.
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !customizeModal.classList.contains('hidden')) closeCustomize();
      });
      // Click backdrop to close.
      customizeModal.addEventListener('click', (e) => {
        if (e.target === customizeModal) closeCustomize();
      });

      // Hook up realtime listeners. window.realtimeSocket is created later in
      // app.js's init(), so we re-attempt on each load() too.
      attachRealtime();
    };

    return {
      applyTranslations,
      bind,
      load,
      refresh,
      attachRealtime,
      detachRealtime,
      getPreferences: () => lastPayload?.preferences || null,
      getDefaultLanding: () => lastPayload?.preferences?.defaultLanding || 'today',
    };
  };

  window.DashboardModule = { create };
}());
