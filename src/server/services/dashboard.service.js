// Aggregates the per-user payload powering GET /api/dashboard.
// Each card loader runs in parallel via Promise.allSettled so a slow or
// failing card never blocks the others. Day-window math is done in Node
// using Intl.DateTimeFormat with the supplied IANA timezone, then passed
// to SQL as ISO strings — keeps the queries portable and avoids AT TIME
// ZONE on TEXT columns.

const logger = require('../logger');
const { fetchDailyQuote, DEFAULT_DAILY_QUOTE } = require('./dailyQuote.service');
const { stripHtml } = require('../utils/tasks');

const DEFAULT_DUE_SOON_DAYS = 3;
const MIN_DUE_SOON_DAYS = 1;
const MAX_DUE_SOON_DAYS = 14;

const PAGE_LIMIT_TASKS = 30;
const ROWS_PER_TASK_SUBSECTION = 5;
const ROWS_PER_BILL_SUBSECTION = 5;
const RECENT_NOTES_LIMIT = 5;
const NOTE_EXCERPT_LENGTH = 120;

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

const trimExcerpt = (text, max = NOTE_EXCERPT_LENGTH) => {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
};

// Resolves IANA timezone validity. Falls back to UTC when invalid.
const isSupportedTimeZone = (tz) => {
  if (!tz || typeof tz !== 'string') return false;
  try {
    // Throws RangeError for invalid IANA names.
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch (_error) {
    return false;
  }
};

const resolveTimezone = (raw) => {
  if (isSupportedTimeZone(raw)) {
    return { timezone: raw, fallback: false };
  }
  return { timezone: 'UTC', fallback: true };
};

const clampDueSoonDays = (raw) => {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return DEFAULT_DUE_SOON_DAYS;
  if (value < MIN_DUE_SOON_DAYS) return MIN_DUE_SOON_DAYS;
  if (value > MAX_DUE_SOON_DAYS) return MAX_DUE_SOON_DAYS;
  return value;
};

// "YYYY-MM-DD" for the supplied UTC instant in the supplied IANA tz.
const formatLocalYmd = (date, timeZone) => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(date);
};

// Returns the UTC instant of "YYYY-MM-DD 00:00:00" in the given timezone.
// Works by binary-searching the offset using Intl, which handles DST.
const localStartOfDayUtc = (ymd, timeZone) => {
  const [year, month, day] = ymd.split('-').map(Number);
  // Start with the naive UTC interpretation, then correct for the tz offset.
  const naive = Date.UTC(year, month - 1, day, 0, 0, 0);
  // Format that instant in the target tz; the diff between the naive UTC ymd
  // and the displayed local ymd-hour gives us the offset to apply.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  // Parse the formatted parts to a timestamp.
  const parts = fmt.formatToParts(new Date(naive));
  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const localAsUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) === 24 ? 0 : Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  // Offset = local - naive. We want naive - offset to land on local midnight.
  const offset = localAsUtc - naive;
  return naive - offset;
};

// Computes today's window plus an N-day-from-now end, all in tz.
const computeWindows = (timezone, dueSoonDays, now = new Date()) => {
  const todayYmd = formatLocalYmd(now, timezone);
  const startOfTodayUtc = localStartOfDayUtc(todayYmd, timezone);
  const startOfTomorrowUtc = startOfTodayUtc + 24 * 60 * 60 * 1000;
  const startOfDueSoonEndUtc = startOfTodayUtc + dueSoonDays * 24 * 60 * 60 * 1000;
  const startOfWeekEndUtc = startOfTodayUtc + 7 * 24 * 60 * 60 * 1000;

  const dueSoonEndYmd = formatLocalYmd(new Date(startOfDueSoonEndUtc), timezone);

  return {
    todayYmd,
    startOfToday: new Date(startOfTodayUtc).toISOString(),
    endOfToday: new Date(startOfTomorrowUtc).toISOString(),
    endOfWeek: new Date(startOfWeekEndUtc).toISOString(),
    dueSoonEndYmd,
  };
};

const sortTasks = (rows) => rows.slice().sort((a, b) => {
  const aHas = Boolean(a.reminder_at);
  const bHas = Boolean(b.reminder_at);
  if (aHas && bHas) return new Date(a.reminder_at) - new Date(b.reminder_at);
  if (aHas) return -1;
  if (bHas) return 1;
  const aRank = PRIORITY_RANK[a.priority] ?? 1;
  const bRank = PRIORITY_RANK[b.priority] ?? 1;
  return aRank - bRank;
});

const projectTaskRow = (row) => ({
  id: row.id,
  title: row.title,
  priority: row.priority,
  tag: row.tag || '',
  reminder_at: row.reminder_at || null,
  status: row.status,
});

const loadTodaysTasks = async ({ allAsync, userId, windows }) => {
  const { startOfToday, endOfToday } = windows;
  const rows = await allAsync(
    `SELECT id, title, priority, tag, reminder_at, status
     FROM tasks
     WHERE user_id = ?
       AND archived = 0
       AND (
         status = 'in_progress'
         OR (reminder_at >= ? AND reminder_at < ?)
         OR (reminder_at IS NOT NULL AND reminder_at < ? AND status <> 'done')
       )
     ORDER BY reminder_at NULLS LAST
     LIMIT ?`,
    [userId, startOfToday, endOfToday, startOfToday, PAGE_LIMIT_TASKS]
  );

  const overdueAll = [];
  const todayAll = [];
  const inProgressAll = [];

  for (const row of rows) {
    const reminder = row.reminder_at ? new Date(row.reminder_at).toISOString() : null;
    if (reminder && reminder < startOfToday && row.status !== 'done') {
      overdueAll.push(row);
    } else if (reminder && reminder >= startOfToday && reminder < endOfToday) {
      todayAll.push(row);
    } else if (row.status === 'in_progress') {
      // If a task is in progress and not already in overdue/today, it goes here.
      if (!overdueAll.includes(row) && !todayAll.includes(row)) {
        inProgressAll.push(row);
      }
    }
  }

  const overdue = sortTasks(overdueAll).slice(0, ROWS_PER_TASK_SUBSECTION).map(projectTaskRow);
  const today = sortTasks(todayAll).slice(0, ROWS_PER_TASK_SUBSECTION).map(projectTaskRow);
  const inProgress = sortTasks(inProgressAll).slice(0, ROWS_PER_TASK_SUBSECTION).map(projectTaskRow);

  return {
    overdue,
    today,
    in_progress: inProgress,
    totalMatching: overdueAll.length + todayAll.length + inProgressAll.length,
  };
};

const loadTaskStatusSummary = async ({ allAsync, userId }) => {
  const rows = await allAsync(
    `SELECT status, COUNT(*)::int AS count
     FROM tasks
     WHERE user_id = ? AND archived = 0
     GROUP BY status`,
    [userId]
  );
  const result = { todo: 0, in_progress: 0, done: 0 };
  for (const row of rows) {
    if (row.status in result) result[row.status] = Number(row.count) || 0;
  }
  return result;
};

const loadRecentNotes = async ({ allAsync, userId }) => {
  const rows = await allAsync(
    `SELECT id, title, body, updated_at
     FROM notes
     WHERE user_id = ?
     ORDER BY updated_at DESC, id DESC
     LIMIT ?`,
    [userId, RECENT_NOTES_LIMIT]
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title || '',
    excerpt: trimExcerpt(stripHtml(row.body || '')),
    updated_at: row.updated_at,
  }));
};

const loadBills = async ({ allAsync, userId, windows }) => {
  const { todayYmd, dueSoonEndYmd } = windows;
  const rows = await allAsync(
    `SELECT id, item, amount, due_date, pay_before
     FROM fast_access_bills bills
     WHERE user_id = ?
       AND status = 'Unpaid'
       AND (
         bills.user_id = (SELECT id FROM users WHERE username = 'admin' ORDER BY id LIMIT 1)
         OR NOT EXISTS (
           SELECT 1
           FROM fast_access_bill_defaults defaults
           WHERE defaults.item = bills.item
             AND defaults.amount = bills.amount
             AND COALESCE(defaults.due_date, '') = COALESCE(bills.due_date, '')
             AND COALESCE(defaults.pay_before, '') = COALESCE(bills.pay_before, '')
             AND defaults.status = bills.status
             AND defaults.sort_order = bills.sort_order
         )
       )
     ORDER BY
       CASE WHEN due_date IS NULL OR due_date = '' THEN 1 ELSE 0 END,
       due_date ASC, id ASC`,
    [userId]
  );

  const overdue = [];
  const dueSoon = [];
  const undated = [];

  for (const row of rows) {
    const due = (row.due_date || '').trim();
    if (!due) {
      undated.push(row);
      continue;
    }
    if (due < todayYmd) {
      overdue.push(row);
    } else if (due < dueSoonEndYmd) {
      dueSoon.push(row);
    }
  }

  const project = (r) => ({
    id: r.id,
    item: r.item,
    amount: String(r.amount),
    due_date: r.due_date || null,
    pay_before: r.pay_before || null,
  });

  return {
    overdue: overdue.slice(0, ROWS_PER_BILL_SUBSECTION).map(project),
    dueSoon: dueSoon.slice(0, ROWS_PER_BILL_SUBSECTION).map(project),
    undated: undated.slice(0, ROWS_PER_BILL_SUBSECTION).map(project),
    totalMatching: overdue.length + dueSoon.length + undated.length,
  };
};

const loadCreditCardSummary = async ({ allAsync, userId, windows }) => {
  const { todayYmd, dueSoonEndYmd } = windows;
  const rows = await allAsync(
    `SELECT id, name, total_balance, interest_charge, closing_date
     FROM credit_cards
     WHERE user_id = ?
     ORDER BY id ASC`,
    [userId]
  );

  let totalBalance = 0;
  let totalInterest = 0;
  const approachingClose = [];

  for (const row of rows) {
    const balance = Number(row.total_balance) || 0;
    const interest = Number(row.interest_charge) || 0;
    totalBalance += balance;
    totalInterest += interest;

    const closing = (row.closing_date || '').trim();
    if (closing && closing >= todayYmd && closing < dueSoonEndYmd) {
      // Compute days-until-close from today's local ymd.
      const [ty, tm, td] = todayYmd.split('-').map(Number);
      const [cy, cm, cd] = closing.split('-').map(Number);
      const todayUtc = Date.UTC(ty, tm - 1, td);
      const closeUtc = Date.UTC(cy, cm - 1, cd);
      const daysUntilClose = Math.round((closeUtc - todayUtc) / (24 * 60 * 60 * 1000));
      approachingClose.push({
        id: row.id,
        name: row.name,
        total_balance: String(row.total_balance),
        closing_date: closing,
        daysUntilClose,
      });
    }
  }

  approachingClose.sort((a, b) => a.closing_date.localeCompare(b.closing_date));

  return {
    totalBalance: totalBalance.toFixed(2),
    totalInterest: totalInterest.toFixed(2),
    cardCount: rows.length,
    approachingClose,
  };
};

const loadWeatherCard = async ({ allAsync, userId }) => {
  const rows = await allAsync(
    `SELECT id, weather_key, name, latitude, longitude
     FROM weather_cities
     WHERE user_id = ?
     ORDER BY LOWER(name), name
     LIMIT 1`,
    [userId]
  );
  if (!rows.length) {
    return { city: null, summary: null };
  }
  // Live weather is fetched client-side from Open-Meteo on demand. The
  // dashboard surfaces just the city descriptor so the front-end can render
  // the current conditions next to it without an extra round trip per page.
  const city = rows[0];
  return {
    city: {
      id: city.id,
      weather_key: city.weather_key,
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
    },
    summary: null,
  };
};

const loadDailyQuoteCard = async () => {
  try {
    const quote = await fetchDailyQuote();
    return quote || DEFAULT_DAILY_QUOTE;
  } catch (_error) {
    return DEFAULT_DAILY_QUOTE;
  }
};

const wrapSettled = async (label, loader) => {
  try {
    const data = await loader();
    return [label, { ok: true, data }];
  } catch (error) {
    logger.error({ err: error }, `Dashboard card ${label} failed`);
    return [label, { ok: false, error: error.code || error.message || 'load_failed' }];
  }
};

const createDashboardService = ({ allAsync }) => {
  const loadDashboard = async (userId, { tz, dueSoonDays } = {}) => {
    const { timezone, fallback } = resolveTimezone(tz);
    const days = clampDueSoonDays(dueSoonDays);
    const windows = computeWindows(timezone, days);

    const ctx = { allAsync, userId, windows };
    const settled = await Promise.all([
      wrapSettled('todaysTasks',       () => loadTodaysTasks(ctx)),
      wrapSettled('taskStatusSummary', () => loadTaskStatusSummary(ctx)),
      wrapSettled('recentNotes',       () => loadRecentNotes(ctx)),
      wrapSettled('bills',             () => loadBills(ctx)),
      wrapSettled('creditCards',       () => loadCreditCardSummary(ctx)),
      wrapSettled('weather',           () => loadWeatherCard(ctx)),
      wrapSettled('dailyQuote',        () => loadDailyQuoteCard()),
    ]);

    const cards = {};
    for (const [, [label, payload]] of settled.entries()) {
      cards[label] = payload;
    }

    return {
      timezone,
      timezoneFallback: fallback,
      today: windows.todayYmd,
      dueSoonDays: days,
      cards,
    };
  };

  return { loadDashboard };
};

module.exports = {
  createDashboardService,
  // Exported for tests.
  resolveTimezone,
  clampDueSoonDays,
  computeWindows,
  trimExcerpt,
};
