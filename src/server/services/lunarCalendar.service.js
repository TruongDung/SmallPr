const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const SYNODIC_MONTH = 29.530588853;
const PI = Math.PI;
const RAD = PI / 180;

const pad2 = (value) => String(value).padStart(2, '0');

const isValidYmd = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

const parseYmd = (ymd) => {
  if (!isValidYmd(ymd)) return null;
  const [year, month, day] = ymd.split('-').map(Number);
  return { year, month, day };
};

const createUtcDateFromYmd = (ymd) => {
  const parsed = parseYmd(ymd);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0));
};

const toYmd = (date) => (
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
);

const isSupportedTimezone = (timezone) => {
  if (!timezone) return true;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

const normalizeTimezone = (timezone) => (
  isSupportedTimezone(timezone) && timezone ? timezone : DEFAULT_TIMEZONE
);

const getTimezoneOffsetHours = (timezone, date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone: normalizeTimezone(timezone),
    year: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  const value = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  const asUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second')
  );
  return Math.round((asUtc - date.getTime()) / MS_PER_HOUR);
};

const jdFromDate = (day, month, year) => {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + (12 * a) - 3;
  const jd = day
    + Math.floor(((153 * m) + 2) / 5)
    + (365 * y)
    + Math.floor(y / 4)
    - Math.floor(y / 100)
    + Math.floor(y / 400)
    - 32045;

  if (jd < 2299161) {
    return day
      + Math.floor(((153 * m) + 2) / 5)
      + (365 * y)
      + Math.floor(y / 4)
      - 32083;
  }

  return jd;
};

const newMoon = (k) => {
  const t = k / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const dr = PI / 180;
  let jd = 2415020.75933
    + (SYNODIC_MONTH * k)
    + (0.0001178 * t2)
    - (0.000000155 * t3);
  jd += 0.00033 * Math.sin((166.56 + (132.87 * t) - (0.009173 * t2)) * dr);

  const m = 359.2242 + (29.10535608 * k) - (0.0000333 * t2) - (0.00000347 * t3);
  const mPrime = 306.0253 + (385.81691806 * k) + (0.0107306 * t2) + (0.00001236 * t3);
  const f = 21.2964 + (390.67050646 * k) - (0.0016528 * t2) - (0.00000239 * t3);
  const c1 = ((0.1734 - (0.000393 * t)) * Math.sin(m * dr))
    + (0.0021 * Math.sin(2 * m * dr))
    - (0.4068 * Math.sin(mPrime * dr))
    + (0.0161 * Math.sin(2 * mPrime * dr))
    - (0.0004 * Math.sin(3 * mPrime * dr))
    + (0.0104 * Math.sin(2 * f * dr))
    - (0.0051 * Math.sin((m + mPrime) * dr))
    - (0.0074 * Math.sin((m - mPrime) * dr))
    + (0.0004 * Math.sin(((2 * f) + m) * dr))
    - (0.0004 * Math.sin(((2 * f) - m) * dr))
    - (0.0006 * Math.sin(((2 * f) + mPrime) * dr))
    + (0.0010 * Math.sin(((2 * f) - mPrime) * dr))
    + (0.0005 * Math.sin(((2 * mPrime) + m) * dr));

  const deltaT = t < -11
    ? 0.001 + (0.000839 * t) + (0.0002261 * t2) - (0.00000845 * t3) - (0.000000081 * t * t3)
    : -0.000278 + (0.000265 * t) + (0.000262 * t2);

  return jd + c1 - deltaT;
};

const getNewMoonDay = (k, timezoneOffsetHours) => (
  Math.floor(newMoon(k) + 0.5 + (timezoneOffsetHours / 24))
);

const sunLongitude = (jdn) => {
  const t = (jdn - 2451545.0) / 36525;
  const t2 = t * t;
  const m = 357.52910 + (35999.05030 * t) - (0.0001559 * t2) - (0.00000048 * t * t2);
  const l0 = 280.46645 + (36000.76983 * t) + (0.0003032 * t2);
  const dl = ((1.914600 - (0.004817 * t) - (0.000014 * t2)) * Math.sin(RAD * m))
    + ((0.019993 - (0.000101 * t)) * Math.sin(RAD * 2 * m))
    + (0.000290 * Math.sin(RAD * 3 * m));
  let l = (l0 + dl) * RAD;
  l -= (PI * 2) * Math.floor(l / (PI * 2));
  return l;
};

const getSunLongitude = (dayNumber, timezoneOffsetHours) => (
  Math.floor((sunLongitude(dayNumber - 0.5 - (timezoneOffsetHours / 24)) / PI) * 6)
);

const getLunarMonth11 = (year, timezoneOffsetHours) => {
  const off = jdFromDate(31, 12, year) - 2415021;
  const k = Math.floor(off / SYNODIC_MONTH);
  let newMoonDay = getNewMoonDay(k, timezoneOffsetHours);
  const sunLong = getSunLongitude(newMoonDay, timezoneOffsetHours);

  if (sunLong >= 9) {
    newMoonDay = getNewMoonDay(k - 1, timezoneOffsetHours);
  }

  return newMoonDay;
};

const getLeapMonthOffset = (a11, timezoneOffsetHours) => {
  const k = Math.floor(((a11 - 2415021.076998695) / SYNODIC_MONTH) + 0.5);
  let i = 1;
  let last = 0;
  let arc = getSunLongitude(getNewMoonDay(k + i, timezoneOffsetHours), timezoneOffsetHours);

  do {
    last = arc;
    i += 1;
    arc = getSunLongitude(getNewMoonDay(k + i, timezoneOffsetHours), timezoneOffsetHours);
  } while (arc !== last && i < 14);

  return i - 1;
};

const convertSolarToLunar = ({ day, month, year, timezoneOffsetHours }) => {
  const dayNumber = jdFromDate(day, month, year);
  const k = Math.floor((dayNumber - 2415021.076998695) / SYNODIC_MONTH);
  let monthStart = getNewMoonDay(k + 1, timezoneOffsetHours);

  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timezoneOffsetHours);
  }

  let a11 = getLunarMonth11(year, timezoneOffsetHours);
  let b11 = a11;
  let lunarYear;

  if (a11 >= monthStart) {
    lunarYear = year;
    a11 = getLunarMonth11(year - 1, timezoneOffsetHours);
  } else {
    lunarYear = year + 1;
    b11 = getLunarMonth11(year + 1, timezoneOffsetHours);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;

  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timezoneOffsetHours);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = true;
      }
    }
  }

  if (lunarMonth > 12) {
    lunarMonth -= 12;
  }

  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }

  return {
    lunar_year: lunarYear,
    lunar_month: lunarMonth,
    lunar_day: lunarDay,
    is_leap_month: lunarLeap,
  };
};

const createLunarCalendarService = () => {
  const addDays = (ymd, days) => {
    const date = createUtcDateFromYmd(ymd);
    if (!date) return null;
    date.setTime(date.getTime() + (Number(days || 0) * MS_PER_DAY));
    return toYmd(date);
  };

  const getYmdInTimezone = (date = new Date(), timezone = DEFAULT_TIMEZONE) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone: normalizeTimezone(timezone),
      year: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  };

  const getLocalTimeParts = (date = new Date(), timezone = DEFAULT_TIMEZONE) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hour12: false,
      hourCycle: 'h23',
      minute: '2-digit',
      timeZone: normalizeTimezone(timezone),
    });
    const parts = formatter.formatToParts(date);
    return {
      hour: Number(parts.find((part) => part.type === 'hour')?.value || 0),
      minute: Number(parts.find((part) => part.type === 'minute')?.value || 0),
    };
  };

  const toLunar = (ymd, timezone = DEFAULT_TIMEZONE) => {
    const parsed = parseYmd(ymd);
    if (!parsed) return null;

    const offsetDate = createUtcDateFromYmd(ymd);
    const timezoneOffsetHours = getTimezoneOffsetHours(timezone, offsetDate);
    return convertSolarToLunar({
      day: parsed.day,
      month: parsed.month,
      year: parsed.year,
      timezoneOffsetHours,
    });
  };

  const formatLunarLabel = (lunar) => {
    if (!lunar) return '';
    if (lunar.lunar_day === 1) return 'Mùng 1';
    if (lunar.lunar_day === 15) return 'Rằm';
    return `L${lunar.lunar_month}/${lunar.lunar_day}`;
  };

  const getKeyLunarDate = (ymd, timezone = DEFAULT_TIMEZONE) => {
    const lunar = toLunar(ymd, timezone);
    if (!lunar || (lunar.lunar_day !== 1 && lunar.lunar_day !== 15)) {
      return null;
    }

    return {
      ...lunar,
      gregorian_date: ymd,
      type: lunar.lunar_day === 1 ? 'LUNAR_DAY_1' : 'LUNAR_DAY_15',
      label: lunar.lunar_day === 1 ? 'Mùng 1' : 'Rằm',
    };
  };

  const getMonthLunarLabels = ({ year, month, timezone = DEFAULT_TIMEZONE }) => {
    const normalizedYear = Number(year);
    const normalizedMonth = Number(month);
    const daysInMonth = new Date(Date.UTC(normalizedYear, normalizedMonth, 0)).getUTCDate();
    const days = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${normalizedYear}-${pad2(normalizedMonth)}-${pad2(day)}`;
      const lunar = toLunar(date, timezone);
      days.push({
        date,
        lunar,
        label: formatLunarLabel(lunar),
      });
    }

    return days;
  };

  return {
    addDays,
    formatLunarLabel,
    getKeyLunarDate,
    getLocalTimeParts,
    getMonthLunarLabels,
    getTimezoneOffsetHours,
    getYmdInTimezone,
    isSupportedTimezone,
    normalizeTimezone,
    toLunar,
  };
};

module.exports = {
  DEFAULT_TIMEZONE,
  createLunarCalendarService,
};
