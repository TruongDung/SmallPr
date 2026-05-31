const calculateNextOccurrence = ({ pattern, interval, days, fromDate = new Date() }) => {
  if (!pattern) return null;

  const date = new Date(fromDate);
  date.setHours(0, 0, 0, 0);

  if (pattern === 'daily') {
    const daysToAdd = interval || 1;
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  }

  if (pattern === 'weekly') {
    if (!days) return null;

    const selectedDays = days.split(',').map(Number).sort((a, b) => a - b);
    if (selectedDays.length === 0) return null;

    const currentDay = date.getDay();

    // Find next occurrence
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + i);
      const nextDay = nextDate.getDay();

      if (selectedDays.includes(nextDay)) {
        return nextDate.toISOString().split('T')[0];
      }
    }
  }

  return null;
};

const createRecurrenceService = ({ createTask }) => {
  const createNextRecurringInstance = async (completedTask) => {
    if (!completedTask.is_recurring) return null;

    const nextDate = calculateNextOccurrence({
      pattern: completedTask.recurrence_pattern,
      interval: completedTask.recurrence_interval,
      days: completedTask.recurrence_days,
      fromDate: new Date()
    });

    if (!nextDate) return null;

    // Create new task with same properties but reset status
    const newTask = await createTask({
      userId: completedTask.user_id,
      title: completedTask.title,
      tag: completedTask.tag,
      description: completedTask.description,
      comment: completedTask.comment,
      priority: completedTask.priority,
      status: 'todo',
      timeSpentMinutes: 0,
      reminderAt: null,
      attachment: null,
      isRecurring: true,
      recurrencePattern: completedTask.recurrence_pattern,
      recurrenceInterval: completedTask.recurrence_interval,
      recurrenceDays: completedTask.recurrence_days,
      parentTaskId: completedTask.parent_task_id || completedTask.id,
      nextOccurrenceDate: nextDate
    });

    return newTask;
  };

  return {
    createNextRecurringInstance,
    calculateNextOccurrence
  };
};

module.exports = {
  createRecurrenceService,
  calculateNextOccurrence
};
