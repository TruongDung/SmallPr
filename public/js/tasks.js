// Shared task helpers used by the task workspace and exports.
(function () {
  const create = ({ t, getRichTextPlainText, getDefaultWeeklyOptions = () => null }) => {
    const priorityLabel = (priority = 'medium') => t(priority || 'medium');

    const priorityRank = (priority = 'medium') => ({
      high: 0,
      medium: 1,
      low: 2,
    }[priority] ?? 3);

    const sortTasksByPriority = (taskList = []) => [...taskList].sort((first, second) => (
      priorityRank(first.priority) - priorityRank(second.priority)
    ));

    const taskStatus = (task) => task.status || (task.completed ? 'done' : 'todo');

    const statusLabel = (status = 'todo') => t(status || 'todo');

    const updatePriorityOptions = (select) => {
      if (!select) return;
      [...select.options].forEach((option) => {
        option.textContent = priorityLabel(option.value);
      });
    };

    const updateStatusOptions = (select) => {
      if (!select) return;
      [...select.options].forEach((option) => {
        option.textContent = statusLabel(option.value);
      });
    };

    const taskMatchesSearch = (task, query) => {
      if (!query) return true;
      const normalizedQuery = query.toLowerCase();
      return [
        task.title,
        getRichTextPlainText(task.description || ''),
        getRichTextPlainText(task.comment || ''),
      ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
    };

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
        hour12: true,
      });
      const formattedParts = {};
      formatter.formatToParts(date).forEach((part) => {
        formattedParts[part.type] = part.value;
      });
      return `${formattedParts.month}/${formattedParts.day}/${formattedParts.year}, ${formattedParts.hour}:${formattedParts.minute}:${formattedParts.second} ${formattedParts.dayPeriod} EST (NYC)`;
    };

    const formatLocalDateTime = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
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
      if (!input) return;
      const dismissIfToday = () => {
        if (isTodayDateTimeValue(input.value)) {
          setTimeout(() => input.blur(), 0);
        }
      };
      input.addEventListener('input', dismissIfToday);
      input.addEventListener('change', dismissIfToday);
    };

    const getSelectedWeekdays = (container = getDefaultWeeklyOptions()) => {
      const checkboxes = container?.querySelectorAll('input[type="checkbox"]:checked') || [];
      return Array.from(checkboxes).map(cb => cb.value).join(',');
    };

    const setSelectedWeekdays = (container, days = '') => {
      const selectedDays = new Set(String(days || '').split(',').filter(Boolean));
      container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.checked = selectedDays.has(checkbox.value);
      });
    };

    const syncRecurrenceOptions = ({ checkbox, options, pattern, daily, weekly, intervalUnit }) => {
      const isRecurring = checkbox.checked;
      const currentPattern = pattern.value;
      const units = {
        daily: 'day(s)',
        weekly: 'week(s)',
        monthly: 'month(s)',
        yearly: 'year(s)',
      };
      options.classList.toggle('hidden', !isRecurring);
      daily.classList.toggle('hidden', !isRecurring);
      weekly.classList.toggle('hidden', !isRecurring || currentPattern !== 'weekly');
      if (intervalUnit) intervalUnit.textContent = units[currentPattern] || units.daily;
    };

    const formatDateTimeLocalValue = (dateString) => {
      if (!dateString) return '';
      return dateString.slice(0, 16);
    };

    return {
      closePickerAfterTodaySelection,
      formatDateEST,
      formatDateTimeLocalValue,
      formatLocalDateTime,
      getSelectedWeekdays,
      setSelectedWeekdays,
      sortTasksByPriority,
      statusLabel,
      syncRecurrenceOptions,
      taskMatchesSearch,
      taskStatus,
      updatePriorityOptions,
      updateStatusOptions,
      priorityLabel,
    };
  };

  window.TasksModule = { create };
})();
