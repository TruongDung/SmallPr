(function () {
  const create = ({ t, getTasks, taskStatus, updateTask, showPreviewTaskModal, showEditTaskModal }) => {
    const root = document.getElementById('calendar-section');
    const grid = document.getElementById('calendar-grid');
    const rangeLabel = document.getElementById('calendar-range-label');
    const upcomingList = document.getElementById('calendar-upcoming-list');
    const overdueList = document.getElementById('calendar-overdue-list');
    const prevButton = document.getElementById('calendar-prev');
    const todayButton = document.getElementById('calendar-today');
    const nextButton = document.getElementById('calendar-next');
    const viewButtons = [...document.querySelectorAll('[data-calendar-view]')];
    const lunarToggle = document.getElementById('calendar-show-lunar');

    let view = 'month';
    let cursor = startOfDay(new Date());
    let showLunar = localStorage.getItem('showLunarCalendar') === 'true';

    function startOfDay(date) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function addDays(date, days) {
      const next = new Date(date);
      next.setDate(next.getDate() + days);
      return next;
    }

    function startOfWeek(date) {
      return addDays(startOfDay(date), -startOfDay(date).getDay());
    }

    function startOfMonth(date) {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    function dateKey(date) {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${date.getFullYear()}-${month}-${day}`;
    }

    function taskDateKey(task) {
      return String(task.due_date || '').slice(0, 10);
    }

    function isOpenTask(task) {
      return taskStatus(task) !== 'done' && !Number(task.archived);
    }

    function tasksForDate(key) {
      return getTasks().filter((task) => isOpenTask(task) && taskDateKey(task) === key);
    }

    function formatShortDate(date) {
      return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
    }

    function formatLongDate(date) {
      return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
    }

    function formatMonth(date) {
      return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
    }

    function buildTaskChip(task, compact = false) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `calendar-task-chip priority-${task.priority || 'medium'}`;
      chip.draggable = true;
      chip.dataset.taskId = task.id;
      chip.title = task.title;
      chip.addEventListener('dragstart', (event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(task.id));
        chip.classList.add('dragging');
      });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
      chip.addEventListener('click', () => showPreviewTaskModal(task));

      const title = document.createElement('span');
      title.textContent = task.title;
      chip.append(title);

      if (!compact && task.tag) {
        const tag = document.createElement('small');
        tag.textContent = task.tag;
        chip.append(tag);
      }
      return chip;
    }

    function bindDropTarget(element, key) {
      element.dataset.date = key;
      element.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      });
      element.addEventListener('dragenter', () => element.classList.add('drag-over'));
      element.addEventListener('dragleave', (event) => {
        if (!element.contains(event.relatedTarget)) element.classList.remove('drag-over');
      });
      element.addEventListener('drop', async (event) => {
        event.preventDefault();
        element.classList.remove('drag-over');
        const taskId = event.dataTransfer.getData('text/plain');
        const task = getTasks().find((item) => String(item.id) === taskId);
        if (!task || taskDateKey(task) === key) return;
        await updateTask(task.id, { due_date: key });
      });
    }

    function renderDayCell(date, { monthDate = null, compact = false } = {}) {
      const key = dateKey(date);
      const dayTasks = tasksForDate(key);
      const cell = document.createElement('section');
      cell.className = 'calendar-day';
      if (dateKey(date) === dateKey(new Date())) cell.classList.add('is-today');
      if (monthDate && date.getMonth() !== monthDate.getMonth()) cell.classList.add('is-outside-month');
      bindDropTarget(cell, key);

      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      const title = document.createElement('h3');
      title.textContent = compact ? String(date.getDate()) : formatLongDate(date);
      
      // Add lunar badge if enabled
      if (showLunar && window.LunarCalendar) {
        const lunarInfo = window.LunarCalendar.getKeyLunarDates(date);
        if (lunarInfo) {
          const badge = document.createElement('span');
          badge.className = 'calendar-lunar-badge';
          badge.textContent = lunarInfo.label;
          badge.title = `Lunar calendar: ${lunarInfo.label}`;
          title.append(' ');
          title.append(badge);
        }
      }

      const count = document.createElement('span');
      count.className = 'calendar-task-count';
      count.textContent = String(dayTasks.length);
      header.append(title, count);
      cell.append(header);

      if (dayTasks.length) {
        const list = document.createElement('div');
        list.className = 'calendar-task-list';
        dayTasks.slice(0, compact ? 3 : 20).forEach((task) => list.append(buildTaskChip(task, compact)));
        if (compact && dayTasks.length > 3) {
          const more = document.createElement('span');
          more.className = 'calendar-more';
          more.textContent = t('calendarMoreTasks', { count: dayTasks.length - 3 });
          list.append(more);
        }
        cell.append(list);
      } else {
        const empty = document.createElement('p');
        empty.className = 'calendar-empty';
        empty.textContent = t('calendarNoTasks');
        cell.append(empty);
      }

      return cell;
    }

    function renderToday() {
      grid.className = 'calendar-grid calendar-grid-today';
      rangeLabel.textContent = formatLongDate(cursor);
      grid.append(renderDayCell(cursor));
    }

    function renderWeek() {
      grid.className = 'calendar-grid calendar-grid-week';
      const start = startOfWeek(cursor);
      const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
      rangeLabel.textContent = `${formatShortDate(days[0])} - ${formatShortDate(days[6])}`;
      days.forEach((date) => grid.append(renderDayCell(date)));
    }

    function renderMonth() {
      grid.className = 'calendar-grid calendar-grid-month';
      const monthStart = startOfMonth(cursor);
      const first = startOfWeek(monthStart);
      rangeLabel.textContent = formatMonth(cursor);

      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((name) => {
        const dayName = document.createElement('div');
        dayName.className = 'calendar-weekday';
        dayName.textContent = name;
        grid.append(dayName);
      });

      Array.from({ length: 42 }, (_, index) => addDays(first, index))
        .forEach((date) => grid.append(renderDayCell(date, { monthDate: cursor, compact: true })));
    }

    function renderDeadlineList(container, list, emptyKey) {
      container.innerHTML = '';
      if (!list.length) {
        const empty = document.createElement('p');
        empty.className = 'calendar-empty';
        empty.textContent = t(emptyKey);
        container.append(empty);
        return;
      }

      list.forEach((task) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = `calendar-deadline-item priority-${task.priority || 'medium'}`;
        row.addEventListener('click', () => showEditTaskModal(task));
        const title = document.createElement('strong');
        title.textContent = task.title;
        const meta = document.createElement('span');
        meta.textContent = `${t('dueDate')}: ${task.due_date}`;
        row.append(title, meta);
        container.append(row);
      });
    }

    function renderDeadlines() {
      const today = startOfDay(new Date());
      const todayKey = dateKey(today);
      const soonKey = dateKey(addDays(today, 7));
      const datedOpenTasks = getTasks()
        .filter((task) => isOpenTask(task) && taskDateKey(task))
        .sort((a, b) => taskDateKey(a).localeCompare(taskDateKey(b)));
      const overdue = datedOpenTasks.filter((task) => taskDateKey(task) < todayKey);
      const upcoming = datedOpenTasks.filter((task) => taskDateKey(task) >= todayKey && taskDateKey(task) <= soonKey);
      renderDeadlineList(upcomingList, upcoming, 'calendarNoUpcoming');
      renderDeadlineList(overdueList, overdue, 'calendarNoOverdue');
    }

    function setView(nextView) {
      view = nextView || view;
      viewButtons.forEach((button) => {
        const active = button.dataset.calendarView === view;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
      });
      render();
    }

    function moveCursor(direction) {
      if (view === 'today') cursor = addDays(cursor, direction);
      if (view === 'week') cursor = addDays(cursor, direction * 7);
      if (view === 'month') cursor = new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1);
      render();
    }

    function render() {
      if (!root || !grid) return;
      grid.innerHTML = '';
      if (view === 'today') renderToday();
      if (view === 'week') renderWeek();
      if (view === 'month') renderMonth();
      renderDeadlines();
    }

    function bind() {
      viewButtons.forEach((button) => button.addEventListener('click', () => setView(button.dataset.calendarView)));
      prevButton?.addEventListener('click', () => moveCursor(-1));
      nextButton?.addEventListener('click', () => moveCursor(1));
      todayButton?.addEventListener('click', () => {
        cursor = startOfDay(new Date());
        render();
      });
      
      // Lunar calendar toggle
      if (lunarToggle) {
        lunarToggle.checked = showLunar;
        lunarToggle.addEventListener('change', (event) => {
          showLunar = event.target.checked;
          localStorage.setItem('showLunarCalendar', String(showLunar));
          render();
        });
      }
    }

    return {
      bind,
      render,
      setView,
    };
  };

  window.CalendarModule = { create };
})();
