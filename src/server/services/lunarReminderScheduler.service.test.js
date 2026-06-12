const { createLunarCalendarService } = require('./lunarCalendar.service');
const {
  createLunarReminderScheduler,
  millisecondsUntilNextRun,
} = require('./lunarReminderScheduler.service');
const { createTaskCreationService } = require('./taskCreation.service');

describe('lunar reminder scheduler service', () => {
  test('generates a reminder when target date is Lunar Day 1', async () => {
    const taskCreation = {
      createLunarReminderTask: jest.fn().mockResolvedValue({
        created: true,
        task: { id: 10, title: 'Upcoming Lunar Day 1 in 3 Days' },
      }),
    };
    const scheduler = createLunarReminderScheduler({
      lunarCalendar: createLunarCalendarService(),
      taskCreation,
      userSettings: {
        listUsersWithLunarRemindersEnabled: jest.fn().mockResolvedValue([{
          user_id: 1,
          timezone: 'Asia/Ho_Chi_Minh',
          reminder_days_before: 3,
          remind_lunar_day1: true,
          remind_lunar_day15: true,
        }]),
      },
    });

    const result = await scheduler.runOnce({
      runAt: new Date('2025-01-26T05:05:00.000Z'),
    });

    expect(result.created).toHaveLength(1);
    expect(taskCreation.createLunarReminderTask).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        reminderDate: '2025-01-26',
        reminderDaysBefore: 3,
        lunar: expect.objectContaining({ lunar_day: 1, gregorian_date: '2025-01-29' }),
      })
    );
  });

  test('skips disabled lunar day selections', async () => {
    const taskCreation = { createLunarReminderTask: jest.fn() };
    const scheduler = createLunarReminderScheduler({
      lunarCalendar: createLunarCalendarService(),
      taskCreation,
      userSettings: {
        listUsersWithLunarRemindersEnabled: jest.fn().mockResolvedValue([{
          user_id: 1,
          timezone: 'Asia/Ho_Chi_Minh',
          reminder_days_before: 3,
          remind_lunar_day1: false,
          remind_lunar_day15: true,
        }]),
      },
    });

    const result = await scheduler.runOnce({
      runAt: new Date('2025-01-26T05:05:00.000Z'),
    });

    expect(result.created).toHaveLength(0);
    expect(result.skipped).toContainEqual(expect.objectContaining({ reason: 'disabled-lunar-day' }));
    expect(taskCreation.createLunarReminderTask).not.toHaveBeenCalled();
  });

  test('task creation service prevents duplicates before insert', async () => {
    const runAsync = jest.fn();
    const service = createTaskCreationService({
      getAsync: jest.fn().mockResolvedValue({ id: 99 }),
      runAsync,
    });

    const result = await service.createLunarReminderTask({
      userId: 1,
      reminderDate: '2025-01-26',
      reminderDaysBefore: 3,
      lunar: {
        lunar_day: 1,
        lunar_month: 1,
        lunar_year: 2025,
        gregorian_date: '2025-01-29',
      },
    });

    expect(result.created).toBe(false);
    expect(runAsync).not.toHaveBeenCalled();
  });

  test('schedules the next local 00:05 run', () => {
    expect(millisecondsUntilNextRun(new Date('2025-01-01T00:04:00'))).toBe(60 * 1000);
    expect(millisecondsUntilNextRun(new Date('2025-01-01T00:06:00'))).toBe(
      (23 * 60 + 59) * 60 * 1000
    );
  });
});
