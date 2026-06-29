const DEFAULT_LUNAR_SETTINGS = Object.freeze({
  enable_lunar_reminder: false,
  reminder_days_before: 3,
  remind_lunar_day1: true,
  remind_lunar_day15: true,
  show_lunar_dates_in_calendar: true,
});

const toBoolean = (value, fallback) => {
  if (value === undefined) return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
};

const normalizeSettingsPayload = (payload = {}, existing = DEFAULT_LUNAR_SETTINGS) => {
  const reminderDaysBefore = payload.reminder_days_before ?? payload.reminderDaysBefore;
  const parsedDays = reminderDaysBefore === undefined ? existing.reminder_days_before : Number(reminderDaysBefore);

  if (!Number.isInteger(parsedDays) || parsedDays < 0 || parsedDays > 30) {
    return { error: 'Reminder days before must be between 0 and 30' };
  }

  const settings = {
    enable_lunar_reminder: toBoolean(
      payload.enable_lunar_reminder ?? payload.enableLunarReminder,
      existing.enable_lunar_reminder,
    ),
    reminder_days_before: parsedDays,
    remind_lunar_day1: toBoolean(payload.remind_lunar_day1 ?? payload.remindLunarDay1, existing.remind_lunar_day1),
    remind_lunar_day15: toBoolean(payload.remind_lunar_day15 ?? payload.remindLunarDay15, existing.remind_lunar_day15),
    show_lunar_dates_in_calendar: toBoolean(
      payload.show_lunar_dates_in_calendar ?? payload.showLunarDatesInCalendar,
      existing.show_lunar_dates_in_calendar,
    ),
  };

  if (settings.enable_lunar_reminder && !settings.remind_lunar_day1 && !settings.remind_lunar_day15) {
    return { error: 'At least one lunar day reminder must be selected' };
  }

  return { value: settings };
};

const mapSettingsRow = (row = {}) => ({
  ...DEFAULT_LUNAR_SETTINGS,
  ...row,
  enable_lunar_reminder: row.enable_lunar_reminder ?? DEFAULT_LUNAR_SETTINGS.enable_lunar_reminder,
  reminder_days_before: row.reminder_days_before ?? DEFAULT_LUNAR_SETTINGS.reminder_days_before,
  remind_lunar_day1: row.remind_lunar_day1 ?? DEFAULT_LUNAR_SETTINGS.remind_lunar_day1,
  remind_lunar_day15: row.remind_lunar_day15 ?? DEFAULT_LUNAR_SETTINGS.remind_lunar_day15,
  show_lunar_dates_in_calendar: row.show_lunar_dates_in_calendar ?? DEFAULT_LUNAR_SETTINGS.show_lunar_dates_in_calendar,
});

const createUserSettingsService = ({ allAsync, getAsync, runAsync }) => {
  const ensureSettings = async (userId) => {
    await runAsync(
      `INSERT INTO user_settings (user_id)
       VALUES (?)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING user_id`,
      [userId],
    );
  };

  const getSettingsForUser = async (userId) => {
    await ensureSettings(userId);
    const row = await getAsync(
      `SELECT enable_lunar_reminder,
              reminder_days_before,
              remind_lunar_day1,
              remind_lunar_day15,
              show_lunar_dates_in_calendar
       FROM user_settings
       WHERE user_id = ?`,
      [userId],
    );
    return mapSettingsRow(row);
  };

  const updateSettingsForUser = async (userId, payload) => {
    const existing = await getSettingsForUser(userId);
    const normalized = normalizeSettingsPayload(payload, existing);
    if (normalized.error) return normalized;

    const settings = normalized.value;
    await runAsync(
      `INSERT INTO user_settings (
         user_id,
         enable_lunar_reminder,
         reminder_days_before,
         remind_lunar_day1,
         remind_lunar_day15,
         show_lunar_dates_in_calendar,
         updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         enable_lunar_reminder = EXCLUDED.enable_lunar_reminder,
         reminder_days_before = EXCLUDED.reminder_days_before,
         remind_lunar_day1 = EXCLUDED.remind_lunar_day1,
         remind_lunar_day15 = EXCLUDED.remind_lunar_day15,
         show_lunar_dates_in_calendar = EXCLUDED.show_lunar_dates_in_calendar,
         updated_at = CURRENT_TIMESTAMP
       RETURNING user_id`,
      [
        userId,
        settings.enable_lunar_reminder,
        settings.reminder_days_before,
        settings.remind_lunar_day1,
        settings.remind_lunar_day15,
        settings.show_lunar_dates_in_calendar,
      ],
    );

    return { value: settings };
  };

  const listUsersWithLunarRemindersEnabled = () =>
    allAsync(
      `SELECT users.id AS user_id,
            COALESCE(users.timezone, ?) AS timezone,
            user_settings.enable_lunar_reminder,
            user_settings.reminder_days_before,
            user_settings.remind_lunar_day1,
            user_settings.remind_lunar_day15,
            user_settings.show_lunar_dates_in_calendar
     FROM user_settings
     JOIN users ON users.id = user_settings.user_id
     WHERE user_settings.enable_lunar_reminder = TRUE
       AND users.account_status = 'enabled'`,
      ['Asia/Ho_Chi_Minh'],
    );

  return {
    getSettingsForUser,
    listUsersWithLunarRemindersEnabled,
    updateSettingsForUser,
  };
};

module.exports = {
  DEFAULT_LUNAR_SETTINGS,
  createUserSettingsService,
  normalizeSettingsPayload,
};
