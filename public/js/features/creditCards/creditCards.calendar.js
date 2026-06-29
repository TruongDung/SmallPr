(function () {
  // Financial calendar: shows recurring monthly credit-card due dates (closing
  // dates), expense/bill due dates, and transactions for the month on a month grid plus an upcoming list.
  const createFinancialCalendar = ({ formatters, t, getLanguage, onLoadTransactions }) => {
    const grid = document.getElementById('financial-calendar-grid');
    const label = document.getElementById('financial-calendar-label');
    const upcomingList = document.getElementById('financial-calendar-upcoming-list');
    const prevButton = document.getElementById('financial-calendar-prev');
    const nextButton = document.getElementById('financial-calendar-next');
    const todayButton = document.getElementById('financial-calendar-today');
    const toggleCard = document.getElementById('financial-calendar-toggle-card');
    const toggleBill = document.getElementById('financial-calendar-toggle-bill');
    const toggleTransaction = document.getElementById('financial-calendar-toggle-transaction');

    let cards = [];
    let bills = [];
    let transactions = [];
    let showCards = true;
    let showBills = true;
    let showTransactions = true;
    let cursor = startOfMonth(new Date());

    function startOfDay(date) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function startOfMonth(date) {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    function addDays(date, days) {
      const next = new Date(date);
      next.setDate(next.getDate() + days);
      return next;
    }

    function startOfWeek(date) {
      return addDays(startOfDay(date), -startOfDay(date).getDay());
    }

    function getLocale() {
      return getLanguage && getLanguage() === 'vi' ? 'vi-VN' : 'en-US';
    }

    function formatMonth(date) {
      return new Intl.DateTimeFormat(getLocale(), { month: 'long', year: 'numeric' }).format(date);
    }

    // Credit-card closing dates recur every month, so we key entries by the
    // day of the month (1-31) rather than a single absolute date.
    function dayFromDateString(value) {
      if (!value) return null;
      const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) return Number(match[3]);
      return null;
    }

    // Bill due dates are free text; try to extract a day-of-month from common
    // shapes like "15", "15th", "2026-06-15", or "06/15".
    function dayFromText(value) {
      if (!value) return null;
      const text = String(value).trim();
      const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (iso) return Number(iso[3]);
      const slash = text.match(/^(\d{1,2})\/(\d{1,2})/);
      if (slash) return Number(slash[2]);
      const ordinal = text.match(/\b(\d{1,2})(st|nd|rd|th)?\b/);
      if (ordinal) {
        const day = Number(ordinal[1]);
        if (day >= 1 && day <= 31) return day;
      }
      return null;
    }

    function getCardEntriesForDay(day) {
      return cards
        .map((card) => ({ card, day: dayFromDateString(card.closing_date) }))
        .filter((entry) => entry.day === day);
    }

    function getBillEntriesForDay(day) {
      return bills.map((bill) => ({ bill, day: dayFromText(bill.due_date) })).filter((entry) => entry.day === day);
    }

    function getTransactionsForDay(date) {
      return transactions.filter((transaction) => {
        if (!transaction.occurred_on) return false;
        const parts = String(transaction.occurred_on).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!parts) return false;
        const txDate = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
        return txDate.getTime() === date.getTime();
      });
    }

    function buildMarker(kind, text) {
      const marker = document.createElement('span');
      marker.className = `financial-calendar-marker financial-calendar-marker-${kind}`;
      marker.textContent = text;
      marker.title = text;
      return marker;
    }

    // ---- Day detail modal --------------------------------------------------
    let dayModal = null;

    function ensureDayModal() {
      if (dayModal) return dayModal;

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop financial-day-backdrop hidden';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');

      const modal = document.createElement('div');
      modal.className = 'modal financial-day-modal';

      const header = document.createElement('div');
      header.className = 'financial-day-modal-header';
      const title = document.createElement('h3');
      title.className = 'financial-day-modal-title';
      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'secondary task-action-icon';
      closeButton.setAttribute('aria-label', t('close') || 'Close');
      closeButton.title = t('close') || 'Close';
      closeButton.textContent = '×';
      closeButton.addEventListener('click', closeDayDetail);
      header.append(title, closeButton);

      const body = document.createElement('div');
      body.className = 'financial-day-modal-body';

      modal.append(header, body);
      backdrop.append(modal);
      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) closeDayDetail();
      });
      document.body.append(backdrop);

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && dayModal && !dayModal.backdrop.classList.contains('hidden')) {
          closeDayDetail();
        }
      });

      dayModal = { backdrop, title, body };
      return dayModal;
    }

    function closeDayDetail() {
      if (dayModal) dayModal.backdrop.classList.add('hidden');
    }

    function buildDetailSection(titleText, kind, items) {
      const section = document.createElement('section');
      section.className = 'financial-day-section';

      const heading = document.createElement('div');
      heading.className = 'financial-day-section-title';
      const dot = document.createElement('span');
      dot.className = `financial-calendar-dot financial-calendar-dot-${kind}`;
      const label = document.createElement('span');
      label.textContent = `${titleText} (${items.length})`;
      heading.append(dot, label);
      section.append(heading);

      const list = document.createElement('div');
      list.className = 'financial-day-item-list';
      items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'financial-day-item';

        const name = document.createElement('span');
        name.className = 'financial-day-item-name';
        name.textContent = item.name;
        row.append(name);

        if (item.meta) {
          const meta = document.createElement('span');
          meta.className = `financial-day-item-meta${item.metaClass ? ` ${item.metaClass}` : ''}`;
          meta.textContent = item.meta;
          row.append(meta);
        }
        list.append(row);
      });
      section.append(list);
      return section;
    }

    function openDayDetail(date) {
      const modal = ensureDayModal();
      modal.title.textContent = new Intl.DateTimeFormat(getLocale(), {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
      modal.body.innerHTML = '';

      const day = date.getDate();
      const cardEntries = showCards ? getCardEntriesForDay(day) : [];
      const billEntries = showBills ? getBillEntriesForDay(day) : [];
      const txEntries = showTransactions ? getTransactionsForDay(date) : [];
      let hasAny = false;

      if (cardEntries.length) {
        hasAny = true;
        modal.body.append(
          buildDetailSection(
            t('financialCalendarCardLegend'),
            'card',
            cardEntries.map((entry) => ({
              name: entry.card.name || t('notAvailable'),
              meta:
                entry.card.total_balance != null && entry.card.total_balance !== ''
                  ? formatters.formatCurrency(entry.card.total_balance)
                  : '',
            })),
          ),
        );
      }

      if (billEntries.length) {
        hasAny = true;
        modal.body.append(
          buildDetailSection(
            t('financialCalendarBillLegend'),
            'bill',
            billEntries.map((entry) => ({
              name: entry.bill.item || t('notAvailable'),
              meta:
                entry.bill.amount != null && entry.bill.amount !== ''
                  ? formatters.formatCurrency(entry.bill.amount)
                  : '',
            })),
          ),
        );
      }

      if (txEntries.length) {
        hasAny = true;
        modal.body.append(
          buildDetailSection(
            t('transactionsSubTab'),
            'transaction',
            txEntries.map((tx) => ({
              name: tx.category || tx.note || t('notAvailable'),
              meta: `${tx.kind === 'income' ? '+' : '-'}${formatters.formatCurrency(tx.amount)}`,
              metaClass: tx.kind === 'income' ? 'amount-income' : 'amount-expense',
            })),
          ),
        );
      }

      if (!hasAny) {
        const empty = document.createElement('p');
        empty.className = 'financial-calendar-empty';
        empty.textContent = t('financialCalendarEmpty');
        modal.body.append(empty);
      }

      modal.backdrop.classList.remove('hidden');
    }

    function renderDayCell(date) {
      const cell = document.createElement('section');
      cell.className = 'financial-calendar-day';
      const today = startOfDay(new Date());
      if (date.getMonth() !== cursor.getMonth()) cell.classList.add('is-outside-month');
      if (startOfDay(date).getTime() === today.getTime()) cell.classList.add('is-today');

      const header = document.createElement('div');
      header.className = 'financial-calendar-day-header';
      header.textContent = String(date.getDate());
      cell.append(header);

      // Only mark days that belong to the displayed month so recurring entries
      // don't bleed into the leading/trailing days from adjacent months.
      if (date.getMonth() === cursor.getMonth()) {
        // Make the day clickable to open a detail view for that date.
        cell.classList.add('is-clickable');
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-label', `${date.getDate()}`);
        cell.addEventListener('click', () => openDayDetail(new Date(date)));
        cell.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openDayDetail(new Date(date));
          }
        });

        const markers = document.createElement('div');
        markers.className = 'financial-calendar-markers';

        if (showCards) {
          getCardEntriesForDay(date.getDate()).forEach((entry) => {
            markers.append(buildMarker('card', entry.card.name || t('notAvailable')));
          });
        }
        if (showBills) {
          getBillEntriesForDay(date.getDate()).forEach((entry) => {
            markers.append(buildMarker('bill', entry.bill.item || t('notAvailable')));
          });
        }
        if (showTransactions) {
          getTransactionsForDay(date).forEach((tx) => {
            const label = tx.category || tx.note || t('notAvailable');
            markers.append(buildMarker('transaction', label));
          });
        }

        if (markers.childElementCount) cell.append(markers);
      }

      return cell;
    }

    function renderGrid() {
      if (!grid) return;
      grid.innerHTML = '';

      const weekdays =
        getLocale() === 'vi-VN'
          ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
          : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      weekdays.forEach((name) => {
        const dayName = document.createElement('div');
        dayName.className = 'financial-calendar-weekday';
        dayName.textContent = name;
        grid.append(dayName);
      });

      const first = startOfWeek(cursor);
      Array.from({ length: 42 }, (_, index) => addDays(first, index)).forEach((date) =>
        grid.append(renderDayCell(date)),
      );
    }

    function renderUpcoming() {
      if (!upcomingList) return;
      upcomingList.innerHTML = '';

      const today = new Date();
      const todayDay = today.getDate();
      const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

      const entries = [];
      if (showCards) {
        cards.forEach((card) => {
          const day = dayFromDateString(card.closing_date);
          if (day) entries.push({ kind: 'card', day, name: card.name || t('notAvailable') });
        });
      }
      if (showBills) {
        bills.forEach((bill) => {
          const day = dayFromText(bill.due_date);
          if (day) entries.push({ kind: 'bill', day, name: bill.item || t('notAvailable') });
        });
      }
      if (showTransactions) {
        transactions.forEach((tx) => {
          const day = dayFromDateString(tx.occurred_on);
          if (day) entries.push({ kind: 'transaction', day, name: tx.category || tx.note || t('notAvailable') });
        });
      }

      // Sort by how soon the day comes up relative to today (wrapping around the
      // month), so the nearest due dates appear first.
      entries.sort((a, b) => {
        const aDelta = (a.day - todayDay + daysInMonth) % daysInMonth;
        const bDelta = (b.day - todayDay + daysInMonth) % daysInMonth;
        return aDelta - bDelta;
      });

      if (!entries.length) {
        const empty = document.createElement('p');
        empty.className = 'financial-calendar-empty';
        empty.textContent = t('financialCalendarEmpty');
        upcomingList.append(empty);
        return;
      }

      entries.forEach((entry) => {
        const row = document.createElement('div');
        row.className = `financial-calendar-upcoming-item financial-calendar-upcoming-${entry.kind}`;

        const dot = document.createElement('span');
        dot.className = `financial-calendar-dot financial-calendar-dot-${entry.kind}`;

        const name = document.createElement('strong');
        name.textContent = entry.name;

        const due = document.createElement('span');
        due.className = 'financial-calendar-upcoming-due';
        due.textContent = t('financialCalendarDayLabel', { day: entry.day });

        row.append(dot, name, due);
        upcomingList.append(row);
      });
    }

    function render() {
      if (label) label.textContent = formatMonth(cursor);
      renderGrid();
      renderUpcoming();
    }

    function moveCursor(direction) {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1);
      // Load transactions for the new month
      if (typeof onLoadTransactions === 'function') {
        onLoadTransactions(cursor.getFullYear(), cursor.getMonth() + 1);
      }
      render();
    }

    function setData({ cards: nextCards, bills: nextBills, transactions: nextTransactions }) {
      if (Array.isArray(nextCards)) cards = nextCards;
      if (Array.isArray(nextBills)) bills = nextBills;
      if (Array.isArray(nextTransactions)) transactions = nextTransactions;
    }

    function bind() {
      prevButton?.addEventListener('click', () => moveCursor(-1));
      nextButton?.addEventListener('click', () => moveCursor(1));
      todayButton?.addEventListener('click', () => {
        cursor = startOfMonth(new Date());
        if (typeof onLoadTransactions === 'function') {
          onLoadTransactions(cursor.getFullYear(), cursor.getMonth() + 1);
        }
        render();
      });

      toggleCard?.addEventListener('change', () => {
        showCards = toggleCard.checked;
        render();
      });
      toggleBill?.addEventListener('change', () => {
        showBills = toggleBill.checked;
        render();
      });
      toggleTransaction?.addEventListener('change', () => {
        showTransactions = toggleTransaction.checked;
        render();
      });
    }

    return { bind, render, setData };
  };

  window.CreditCardFeature = {
    ...(window.CreditCardFeature || {}),
    createFinancialCalendar,
  };
})();
