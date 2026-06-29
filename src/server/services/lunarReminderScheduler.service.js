const logger = require('../logger');

const RUN_HOUR = 0;
const RUN_MINUTE = 5;

const millisecondsUntilNextRun = (now = new Date()) => {
  const next = new Date(now);
  next.setHours(RUN_HOUR, RUN_MINUTE, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
};

const shouldRemindForLunarDay = (settings, lunarDay) =>
  (Number(lunarDay) === 1 && settings.remind_lunar_day1) || (Number(lunarDay) === 15 && settings.remind_lunar_day15);

const createLunarReminderScheduler = ({
  cache = null,
  emitToUser = null,
  lunarCalendar,
  taskCreation,
  userSettings,
  now = () => new Date(),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) => {
  let timer = null;
  let running = false;

  const runOnce = async ({ runAt = now() } = {}) => {
    if (running) return { skipped: true };
    running = true;
    const created = [];
    const skipped = [];

    try {
      const users = await userSettings.listUsersWithLunarRemindersEnabled();

      for (const settings of users) {
        const timezone = lunarCalendar.normalizeTimezone(settings.timezone);
        const reminderDate = lunarCalendar.getYmdInTimezone(runAt, timezone);
        const targetDate = lunarCalendar.addDays(reminderDate, settings.reminder_days_before);
        const lunar = lunarCalendar.getKeyLunarDate(targetDate, timezone);

        if (!lunar) {
          skipped.push({ userId: settings.user_id, reason: 'not-key-lunar-day', targetDate });
          continue;
        }

        if (!shouldRemindForLunarDay(settings, lunar.lunar_day)) {
          skipped.push({ userId: settings.user_id, reason: 'disabled-lunar-day', targetDate });
          continue;
        }

        const result = await taskCreation.createLunarReminderTask({
          userId: settings.user_id,
          lunar,
          reminderDate,
          reminderDaysBefore: settings.reminder_days_before,
        });

        if (result.created) {
          created.push(result.task);
          await cache?.clearUserCache?.(settings.user_id);
          emitToUser?.(settings.user_id, 'task:created', { task: result.task });
        } else {
          skipped.push({ userId: settings.user_id, reason: 'duplicate', targetDate });
        }
      }

      if (created.length) {
        logger.info({ created: created.length }, 'Created lunar reminder tasks');
      }

      return { created, skipped };
    } catch (error) {
      logger.error({ err: error }, 'Lunar reminder scheduler failed');
      return { error, created, skipped };
    } finally {
      running = false;
    }
  };

  const scheduleNext = () => {
    const delay = millisecondsUntilNextRun(now());
    timer = setTimer(async () => {
      await runOnce();
      scheduleNext();
    }, delay);
    timer.unref?.();
  };

  const start = () => {
    if (timer) return;
    runOnce();
    scheduleNext();
  };

  const stop = () => {
    if (!timer) return;
    clearTimer(timer);
    timer = null;
  };

  return {
    runOnce,
    start,
    stop,
  };
};

module.exports = {
  createLunarReminderScheduler,
  millisecondsUntilNextRun,
  shouldRemindForLunarDay,
};
