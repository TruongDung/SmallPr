// US Federal Holidays and common observance dates.
// Holidays that fall on a weekend are observed on the nearest weekday — that
// "observed" date is what most offices and banks follow.
(function () {
  // --- helpers ---
  function nthWeekday(year, month, weekday, n) {
    // month: 0-based, weekday: 0=Sun…6=Sat, n: 1-based (1=first, -1=last)
    if (n > 0) {
      const d = new Date(year, month, 1);
      const diff = (weekday - d.getDay() + 7) % 7;
      return new Date(year, month, 1 + diff + (n - 1) * 7);
    }
    // n < 0 → count from end of month
    const last = new Date(year, month + 1, 0);
    const diff = (last.getDay() - weekday + 7) % 7;
    return new Date(year, month, last.getDate() - diff);
  }

  function observed(date) {
    const dow = date.getDay();
    if (dow === 6) return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1); // Sat → Fri
    if (dow === 0) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1); // Sun → Mon
    return date;
  }

  function fmt(date) {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  }

  function buildYear(year) {
    const holidays = [];

    const add = (name, date, isObservance = false) => {
      const obs = observed(date);
      const sameDay = fmt(date) === fmt(obs);
      // Always add the actual holiday date
      holidays.push({ date: fmt(date), name, isObservance: false });
      // Add observed date if it differs
      if (!sameDay) {
        holidays.push({ date: fmt(obs), name: `${name} (observed)`, isObservance: true });
      }
    };

    // Fixed-date federal holidays
    add("New Year's Day",          new Date(year, 0, 1));
    add('Juneteenth',               new Date(year, 5, 19));
    add('Independence Day',         new Date(year, 6, 4));
    add('Veterans Day',             new Date(year, 10, 11));
    add('Christmas Day',            new Date(year, 11, 25));

    // Floating federal holidays
    add("Martin Luther King Jr. Day",   nthWeekday(year, 0, 1, 3));   // 3rd Mon Jan
    add("Presidents' Day",              nthWeekday(year, 1, 1, 3));   // 3rd Mon Feb
    add('Memorial Day',                  nthWeekday(year, 4, 1, -1));  // Last Mon May
    add('Labor Day',                     nthWeekday(year, 8, 1, 1));   // 1st Mon Sep
    add('Columbus Day',                  nthWeekday(year, 9, 1, 2));   // 2nd Mon Oct
    add('Thanksgiving Day',              nthWeekday(year, 10, 4, 4));  // 4th Thu Nov

    // Common observances (not federal but widely observed)
    add("Valentine's Day",           new Date(year, 1, 14),  true);
    add("St. Patrick's Day",         new Date(year, 2, 17),  true);
    add('Tax Day',                   new Date(year, 3, 15),  true);
    add('Earth Day',                 new Date(year, 3, 22),  true);
    add('Halloween',                 new Date(year, 9, 31),  true);
    add('Christmas Eve',             new Date(year, 11, 24), true);
    add("New Year's Eve",            new Date(year, 11, 31), true);

    // Mother's Day: 2nd Sun May
    holidays.push({ date: fmt(nthWeekday(year, 4, 0, 2)), name: "Mother's Day", isObservance: true });
    // Father's Day: 3rd Sun Jun
    holidays.push({ date: fmt(nthWeekday(year, 5, 0, 3)), name: "Father's Day", isObservance: true });
    // Easter (Gregorian algorithm)
    const easter = computeEaster(year);
    holidays.push({ date: fmt(easter), name: 'Easter Sunday', isObservance: true });

    return holidays;
  }

  // Gregorian Easter calculation (Anonymous Gregorian algorithm)
  function computeEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
  }

  // Cache built years so we don't recompute on every render
  const cache = {};

  function getHolidaysForDate(date) {
    const year = date.getFullYear();
    if (!cache[year]) cache[year] = buildYear(year);
    const key = fmt(date);
    return cache[year].filter((h) => h.date === key);
  }

  window.USHolidays = { getHolidaysForDate };
})();
