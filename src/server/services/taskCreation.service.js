const TASK_TYPES = Object.freeze({
  NORMAL: 'NORMAL',
  LUNAR_REMINDER: 'LUNAR_REMINDER',
});

const getReminderCopy = ({ lunarDay, reminderDaysBefore }) => {
  if (Number(lunarDay) === 1) {
    return {
      title: `Upcoming Lunar Day 1 in ${reminderDaysBefore} Days`,
      description: `In ${reminderDaysBefore} days it will be Lunar Day 1 (Mùng 1).`,
    };
  }

  return {
    title: `Upcoming Full Moon Day in ${reminderDaysBefore} Days`,
    description: `In ${reminderDaysBefore} days it will be Lunar Day 15 (Ngày Rằm).`,
  };
};

const createTaskCreationService = ({ getAsync, runAsync }) => {
  const findExistingLunarReminder = ({ userId, lunarDay, reminderDate }) => getAsync(
    `SELECT id, title, due_date, lunar_day, lunar_month, reminder_date
     FROM tasks
     WHERE user_id = ?
       AND type = ?
       AND lunar_day = ?
       AND reminder_date = ?
     LIMIT 1`,
    [userId, TASK_TYPES.LUNAR_REMINDER, lunarDay, reminderDate]
  );

  const createLunarReminderTask = async ({
    userId,
    lunar,
    reminderDate,
    reminderDaysBefore,
  }) => {
    const existing = await findExistingLunarReminder({
      userId,
      lunarDay: lunar.lunar_day,
      reminderDate,
    });

    if (existing) {
      return { created: false, task: existing };
    }

    const copy = getReminderCopy({
      lunarDay: lunar.lunar_day,
      reminderDaysBefore,
    });

    const result = await runAsync(
      `INSERT INTO tasks (
         user_id,
         title,
         tag,
         description,
         priority,
         status,
         completed,
         due_date,
         type,
         is_system_generated,
         lunar_day,
         lunar_month,
         lunar_year,
         reminder_date,
         lunar_event_date
       )
       VALUES (?, ?, ?, ?, 'medium', 'todo', 0, ?, ?, TRUE, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        userId,
        copy.title,
        'Lunar',
        copy.description,
        reminderDate,
        TASK_TYPES.LUNAR_REMINDER,
        lunar.lunar_day,
        lunar.lunar_month,
        lunar.lunar_year,
        reminderDate,
        lunar.gregorian_date,
      ]
    );

    const task = await getAsync('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [result.lastID, userId]);
    return { created: true, task };
  };

  return {
    createLunarReminderTask,
    findExistingLunarReminder,
  };
};

module.exports = {
  TASK_TYPES,
  createTaskCreationService,
  getReminderCopy,
};
