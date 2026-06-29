require('dotenv').config();

const bcrypt = require('bcrypt');

const { pool, allAsync, getAsync, runAsync } = require('../db/client');
const { initializeDatabase } = require('../db/initialize');
const { createLunarCalendarService } = require('./lunarCalendar.service');
const { createLunarReminderScheduler } = require('./lunarReminderScheduler.service');
const { createTaskCreationService } = require('./taskCreation.service');
const { createUserSettingsService } = require('./userSettings.service');

const RUN_ID = `lunar-it-${Date.now()}-${Math.round(Math.random() * 100000)}`;

const dbDateYmd = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : new Date(text).toISOString().slice(0, 10);
};

describe('lunar reminder integration', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE username LIKE $1', [`${RUN_ID}%`]).catch(() => {});
    await pool.end();
  });

  test('scheduler execution inserts one database reminder for a user', async () => {
    const password = await bcrypt.hash('Password123!', 10);
    const userResult = await pool.query(
      `INSERT INTO users (username, email, password, account_status, timezone)
       VALUES ($1, $2, $3, 'enabled', 'Asia/Ho_Chi_Minh')
       RETURNING id`,
      [`${RUN_ID}-user`, `${RUN_ID}@example.com`, password],
    );
    const userId = userResult.rows[0].id;

    const settings = createUserSettingsService({ allAsync, getAsync, runAsync });
    const saved = await settings.updateSettingsForUser(userId, {
      enable_lunar_reminder: true,
      reminder_days_before: 3,
      remind_lunar_day1: true,
      remind_lunar_day15: false,
      show_lunar_dates_in_calendar: true,
    });
    expect(saved.error).toBeUndefined();

    const scheduler = createLunarReminderScheduler({
      lunarCalendar: createLunarCalendarService(),
      taskCreation: createTaskCreationService({ getAsync, runAsync }),
      userSettings: settings,
    });

    const firstRun = await scheduler.runOnce({
      runAt: new Date('2025-01-26T05:05:00.000Z'),
    });
    const secondRun = await scheduler.runOnce({
      runAt: new Date('2025-01-26T05:05:00.000Z'),
    });

    expect(firstRun.created).toHaveLength(1);
    expect(secondRun.created).toHaveLength(0);

    const tasks = await pool.query(
      `SELECT title, description, type, is_system_generated, lunar_day, lunar_month, reminder_date
       FROM tasks
       WHERE user_id = $1 AND type = 'LUNAR_REMINDER'`,
      [userId],
    );

    expect(tasks.rows).toHaveLength(1);
    expect(tasks.rows[0]).toMatchObject({
      title: 'Upcoming Lunar Day 1 in 3 Days',
      type: 'LUNAR_REMINDER',
      is_system_generated: true,
      lunar_day: 1,
      lunar_month: 1,
    });
    expect(dbDateYmd(tasks.rows[0].reminder_date)).toBe('2025-01-26');
    expect(tasks.rows[0].description).toContain('Mùng 1');
  });
});
