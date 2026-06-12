const { createLunarCalendarService } = require('./lunarCalendar.service');

describe('lunar calendar service', () => {
  const lunarCalendar = createLunarCalendarService();

  test('converts Gregorian dates to key lunar dates', () => {
    expect(lunarCalendar.toLunar('2025-01-29')).toMatchObject({
      lunar_year: 2025,
      lunar_month: 1,
      lunar_day: 1,
    });
    expect(lunarCalendar.getKeyLunarDate('2025-02-12')).toMatchObject({
      lunar_month: 1,
      lunar_day: 15,
      type: 'LUNAR_DAY_15',
    });
    expect(lunarCalendar.toLunar('2026-02-17', 'Asia/Ho_Chi_Minh')).toMatchObject({
      lunar_year: 2026,
      lunar_month: 1,
      lunar_day: 1,
    });
    expect(lunarCalendar.getKeyLunarDate('2026-08-27', 'Asia/Ho_Chi_Minh')).toMatchObject({
      lunar_month: 7,
      lunar_day: 15,
      type: 'LUNAR_DAY_15',
    });
  });

  test('detects leap lunar months in the Vietnamese calendar', () => {
    expect(lunarCalendar.toLunar('2025-07-25')).toMatchObject({
      lunar_month: 6,
      lunar_day: 1,
      is_leap_month: true,
    });
  });

  test('returns no key date for ordinary lunar days', () => {
    expect(lunarCalendar.getKeyLunarDate('2026-07-24', 'Asia/Ho_Chi_Minh')).toBeNull();
    expect(lunarCalendar.toLunar('2026-07-24', 'Asia/Ho_Chi_Minh')).toMatchObject({
      lunar_month: 6,
      lunar_day: 11,
    });
  });

  test('calculates local dates in the configured timezone', () => {
    const runAt = new Date('2025-01-25T18:30:00.000Z');
    expect(lunarCalendar.getYmdInTimezone(runAt, 'Asia/Ho_Chi_Minh')).toBe('2025-01-26');
    expect(lunarCalendar.getYmdInTimezone(runAt, 'America/New_York')).toBe('2025-01-25');
  });

  test('handles year transition date arithmetic', () => {
    expect(lunarCalendar.addDays('2025-12-30', 3)).toBe('2026-01-02');
  });
});
