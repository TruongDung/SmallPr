const WEEKDAY_VALUES = new Set([0, 1, 2, 3, 4, 5, 6]);
const FREQUENCIES = new Set(['daily', 'weekly', 'monthly', 'yearly']);

const pad = (value) => String(value).padStart(2, '0');

const toYmd = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  return String(value).slice(0, 10);
};

const parseYmd = (value) => {
  const [year, month, day] = toYmd(value).split('-').map(Number);
  return { year, month, day };
};

const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const ymdToDate = (value) => {
  const { year, month, day } = parseYmd(value);
  return new Date(Date.UTC(year, month - 1, day));
};

const dateToYmd = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const addDays = (value, count) => {
  const date = ymdToDate(value);
  date.setUTCDate(date.getUTCDate() + count);
  return dateToYmd(date);
};

const addMonths = (value, count) => {
  const { year, month, day } = parseYmd(value);
  const targetMonthIndex = (year * 12) + (month - 1) + count;
  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = (targetMonthIndex % 12) + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`;
};

const addYears = (value, count) => addMonths(value, count * 12);

const weekdayForYmd = (value) => ymdToDate(value).getUTCDay();

const isSupportedTimezone = (timezone) => {
  if (!timezone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

const getTodayYmd = (timezone = 'UTC', now = new Date()) => {
  const safeTimezone = isSupportedTimezone(timezone) ? timezone : 'UTC';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now).reduce((memo, part) => {
    memo[part.type] = part.value;
    return memo;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const normalizeWeekdays = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const entries = Array.isArray(value) ? value : String(value).split(',');
  const days = [...new Set(entries
    .map((entry) => Number(entry))
    .filter((entry) => WEEKDAY_VALUES.has(entry)))].sort((a, b) => a - b);
  return days.length ? days : null;
};

const normalizeRuleInput = (input = {}, fallback = {}) => {
  const frequency = String(input.frequency || input.recurrencePattern || fallback.frequency || fallback.recurrence_pattern || '').trim();
  const interval = Math.max(1, Number(input.interval || input.recurrenceInterval || fallback.interval || fallback.recurrence_interval || 1) || 1);
  const timezone = input.timezone || input.recurrenceTimezone || fallback.timezone || fallback.recurrence_timezone || 'UTC';
  const startDate = toYmd(input.startDate || input.recurrenceStartDate || fallback.start_date || fallback.due_date);
  const endDate = toYmd(input.endDate || input.recurrenceEndDate || fallback.end_date || fallback.recurrence_end_date);
  const occurrenceLimit = input.occurrenceLimit || input.recurrenceOccurrenceLimit || fallback.occurrence_limit || fallback.recurrence_occurrence_limit || null;
  const weekdays = normalizeWeekdays(input.weekdays || input.recurrenceDays || fallback.weekdays || fallback.recurrence_days);

  if (!FREQUENCIES.has(frequency)) {
    return { error: 'Recurrence frequency must be daily, weekly, monthly, or yearly' };
  }
  if (!startDate) {
    return { error: 'Recurrence start date is required' };
  }
  if (!isSupportedTimezone(timezone)) {
    return { error: 'Recurrence timezone is invalid' };
  }
  if (frequency === 'weekly' && !weekdays?.length) {
    return { error: 'Weekly recurrence requires at least one weekday' };
  }
  if (occurrenceLimit !== null && (!Number.isInteger(Number(occurrenceLimit)) || Number(occurrenceLimit) <= 0)) {
    return { error: 'Recurrence occurrence limit must be a positive number' };
  }

  return {
    value: {
      frequency,
      interval,
      startDate,
      endDate,
      occurrenceLimit: occurrenceLimit === null ? null : Number(occurrenceLimit),
      weekdays,
      timezone,
    },
  };
};

const calculateNextOccurrence = ({
  frequency,
  pattern,
  interval = 1,
  weekdays,
  days,
  fromDate,
  startDate,
}) => {
  const normalizedFrequency = frequency || pattern;
  const normalizedInterval = Math.max(1, Number(interval) || 1);
  const anchor = toYmd(fromDate || startDate);
  if (!FREQUENCIES.has(normalizedFrequency) || !anchor) return null;

  if (normalizedFrequency === 'daily') {
    return addDays(anchor, normalizedInterval);
  }

  if (normalizedFrequency === 'monthly') {
    return addMonths(anchor, normalizedInterval);
  }

  if (normalizedFrequency === 'yearly') {
    return addYears(anchor, normalizedInterval);
  }

  const selectedDays = normalizeWeekdays(weekdays || days);
  if (!selectedDays?.length) return null;
  for (let offset = 1; offset <= normalizedInterval * 7; offset += 1) {
    const candidate = addDays(anchor, offset);
    const weeksElapsed = Math.floor((offset - 1) / 7);
    if (weeksElapsed % normalizedInterval === 0 && selectedDays.includes(weekdayForYmd(candidate))) {
      return candidate;
    }
  }
  return null;
};

const isPastRuleEnd = (rule, dueDate) => (
  (rule.end_date && dueDate > toYmd(rule.end_date)) ||
  (rule.occurrence_limit && Number(rule.generated_count || 0) >= Number(rule.occurrence_limit))
);

const createRecurrenceService = ({
  allAsync,
  auditLogs = null,
  getAsync,
  getUserById = null,
  queryAsync,
  runAsync,
  sendTaskAlertEmail = null,
}) => {
  const recordAudit = async (event) => {
    if (!auditLogs) return;
    await auditLogs.record(event);
  };

  const createRuleForTask = async ({ task, input = {}, actor = {} }) => {
    const normalized = normalizeRuleInput(input, {
      recurrence_pattern: task.recurrence_pattern,
      recurrence_interval: task.recurrence_interval,
      recurrence_days: task.recurrence_days,
      recurrence_timezone: task.recurrence_timezone,
      recurrence_end_date: task.recurrence_end_date,
      recurrence_occurrence_limit: task.recurrence_occurrence_limit,
      due_date: task.due_date,
    });
    if (normalized.error) return normalized;

    const rule = normalized.value;
    const result = await runAsync(
      `INSERT INTO recurring_task_rules (
         user_id, template_task_id, frequency, interval, start_date, end_date,
         occurrence_limit, weekdays, timezone, status, generated_count, next_due_date
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?::int[], ?, 'active', 1, ?)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        task.user_id,
        task.id,
        rule.frequency,
        rule.interval,
        rule.startDate,
        rule.endDate,
        rule.occurrenceLimit,
        rule.weekdays,
        rule.timezone,
        calculateNextOccurrence({
          frequency: rule.frequency,
          interval: rule.interval,
          weekdays: rule.weekdays,
          fromDate: rule.startDate,
        }),
      ]
    );

    const ruleId = result.lastID || (await getAsync(
      'SELECT id FROM recurring_task_rules WHERE template_task_id = ? AND status <> ?',
      [task.id, 'deleted']
    ))?.id;

    if (!ruleId) return { error: 'Failed to create recurrence rule' };

    await runAsync(
      `UPDATE tasks SET
         is_recurring = TRUE,
         recurring_rule_id = ?,
         recurrence_pattern = ?,
         recurrence_interval = ?,
         recurrence_days = ?,
         recurrence_timezone = ?,
         recurrence_end_date = ?,
         recurrence_occurrence_limit = ?,
         recurrence_occurrence_index = COALESCE(recurrence_occurrence_index, 1),
         next_occurrence_date = ?
       WHERE id = ? AND user_id = ?`,
      [
        ruleId,
        rule.frequency,
        rule.interval,
        rule.weekdays?.join(',') || null,
        rule.timezone,
        rule.endDate,
        rule.occurrenceLimit,
        calculateNextOccurrence({
          frequency: rule.frequency,
          interval: rule.interval,
          weekdays: rule.weekdays,
          fromDate: rule.startDate,
        }),
        task.id,
        task.user_id,
      ]
    );

    const createdRule = await getAsync('SELECT * FROM recurring_task_rules WHERE id = ?', [ruleId]);
    await recordAudit({
      userId: task.user_id,
      actorUserId: actor.actorUserId || task.user_id,
      impersonatorUserId: actor.impersonatorUserId || null,
      action: 'recurrence_created',
      entityType: 'recurrence',
      entityId: ruleId,
      summary: task.title,
      after: createdRule,
    });
    return { rule: createdRule };
  };

  const updateRuleForTask = async ({ task, input = {}, actor = {}, scope = 'future' }) => {
    if (!task.recurring_rule_id) {
      return createRuleForTask({ task, input, actor });
    }

    const existing = await getAsync(
      'SELECT * FROM recurring_task_rules WHERE id = ? AND user_id = ? AND status <> ?',
      [task.recurring_rule_id, task.user_id, 'deleted']
    );
    if (!existing) return { error: 'Recurrence rule not found' };

    const normalized = normalizeRuleInput(input, existing);
    if (normalized.error) return normalized;
    const rule = normalized.value;
    const nextDueDate = calculateNextOccurrence({
      frequency: rule.frequency,
      interval: rule.interval,
      weekdays: rule.weekdays,
      fromDate: task.due_date || existing.last_generated_due_date || rule.startDate,
    });

    await runAsync(
      `UPDATE recurring_task_rules SET
         frequency = ?, interval = ?, start_date = ?, end_date = ?,
         occurrence_limit = ?, weekdays = ?::int[], timezone = ?,
         next_due_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        rule.frequency,
        rule.interval,
        rule.startDate,
        rule.endDate,
        rule.occurrenceLimit,
        rule.weekdays,
        rule.timezone,
        nextDueDate,
        existing.id,
        task.user_id,
      ]
    );

    await runAsync(
      `UPDATE tasks SET
         is_recurring = TRUE,
         recurrence_pattern = ?,
         recurrence_interval = ?,
         recurrence_days = ?,
         recurrence_timezone = ?,
         recurrence_end_date = ?,
         recurrence_occurrence_limit = ?,
         next_occurrence_date = ?
       WHERE user_id = ? AND recurring_rule_id = ? AND (? = 'future' OR id = ?)`,
      [
        rule.frequency,
        rule.interval,
        rule.weekdays?.join(',') || null,
        rule.timezone,
        rule.endDate,
        rule.occurrenceLimit,
        nextDueDate,
        task.user_id,
        existing.id,
        scope,
        task.id,
      ]
    );

    const updatedRule = await getAsync('SELECT * FROM recurring_task_rules WHERE id = ?', [existing.id]);
    await recordAudit({
      userId: task.user_id,
      actorUserId: actor.actorUserId || task.user_id,
      impersonatorUserId: actor.impersonatorUserId || null,
      action: 'recurrence_updated',
      entityType: 'recurrence',
      entityId: existing.id,
      summary: task.title,
      before: existing,
      after: updatedRule,
    });
    return { rule: updatedRule };
  };

  const setRuleStatusForTask = async ({ task, status, actor = {} }) => {
    const existing = task.recurring_rule_id ? await getAsync(
      'SELECT * FROM recurring_task_rules WHERE id = ? AND user_id = ?',
      [task.recurring_rule_id, task.user_id]
    ) : null;
    if (!existing) return { error: 'Recurrence rule not found' };

    await runAsync(
      'UPDATE recurring_task_rules SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [status, existing.id, task.user_id]
    );
    if (status === 'deleted') {
      await runAsync(
        `UPDATE tasks SET is_recurring = FALSE, recurring_rule_id = NULL, next_occurrence_date = NULL
         WHERE user_id = ? AND recurring_rule_id = ?`,
        [task.user_id, existing.id]
      );
    }
    const updated = await getAsync('SELECT * FROM recurring_task_rules WHERE id = ?', [existing.id]);
    const action = status === 'paused'
      ? 'recurrence_paused'
      : status === 'active'
        ? 'recurrence_resumed'
        : 'recurrence_deleted';
    await recordAudit({
      userId: task.user_id,
      actorUserId: actor.actorUserId || task.user_id,
      impersonatorUserId: actor.impersonatorUserId || null,
      action,
      entityType: 'recurrence',
      entityId: existing.id,
      summary: task.title,
      before: existing,
      after: updated,
    });
    return { rule: updated };
  };

  const findDueRules = async ({ limit = 100, now = new Date() } = {}) => {
    const rows = await allAsync(
      `SELECT rules.*, tasks.title, tasks.tag, tasks.description, tasks.comment,
              tasks.priority, tasks.reminder_at, tasks.attachment_name, tasks.attachment_type,
              tasks.attachment_data, tasks.attachment_size
       FROM recurring_task_rules rules
       JOIN tasks ON tasks.id = rules.template_task_id
       WHERE rules.status = 'active'
         AND rules.next_due_date IS NOT NULL
       ORDER BY rules.next_due_date ASC, rules.id ASC
       LIMIT ?`,
      [limit]
    );
    return rows.filter((rule) => toYmd(rule.next_due_date) <= getTodayYmd(rule.timezone, now));
  };

  const generateNextTaskForRule = async (rule, { actorUserId = null, now = new Date() } = {}) => {
    if (!rule.title && rule.template_task_id) {
      const template = await getAsync('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [rule.template_task_id, rule.user_id]);
      if (!template) return null;
      rule = {
        ...rule,
        title: template.title,
        tag: template.tag,
        description: template.description,
        comment: template.comment,
        priority: template.priority,
        reminder_at: template.reminder_at,
        attachment_name: template.attachment_name,
        attachment_type: template.attachment_type,
        attachment_data: template.attachment_data,
        attachment_size: template.attachment_size,
      };
    }

    const dueDate = toYmd(rule.next_due_date);
    if (!dueDate || dueDate > getTodayYmd(rule.timezone, now) || isPastRuleEnd(rule, dueDate)) {
      return null;
    }

    const nextOccurrenceIndex = Number(rule.generated_count || 0) + 1;
    const result = await queryAsync(
      `INSERT INTO tasks (
         user_id, title, tag, description, comment, priority, status, completed,
         time_spent_minutes, due_date, reminder_at, is_recurring, recurrence_pattern,
         recurrence_interval, recurrence_days, recurrence_timezone, recurrence_end_date,
         recurrence_occurrence_limit, parent_task_id, recurring_rule_id,
         recurrence_occurrence_index, next_occurrence_date, attachment_name,
         attachment_type, attachment_data, attachment_size
       ) VALUES (?, ?, ?, ?, ?, ?, 'todo', 0, 0, ?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        rule.user_id,
        rule.title,
        rule.tag,
        rule.description || '',
        rule.comment || '',
        rule.priority || 'medium',
        dueDate,
        rule.reminder_at || null,
        rule.frequency,
        rule.interval,
        Array.isArray(rule.weekdays) ? rule.weekdays.join(',') : null,
        rule.timezone,
        toYmd(rule.end_date),
        rule.occurrence_limit,
        rule.template_task_id,
        rule.id,
        nextOccurrenceIndex,
        rule.attachment_name,
        rule.attachment_type,
        rule.attachment_data,
        rule.attachment_size || 0,
      ]
    );

    const nextDueDate = calculateNextOccurrence({
      frequency: rule.frequency,
      interval: rule.interval,
      weekdays: rule.weekdays,
      fromDate: dueDate,
    });

    const inserted = Boolean(result.rows[0]);
    const generatedTask = result.rows[0] || await getAsync(
      'SELECT * FROM tasks WHERE recurring_rule_id = ? AND due_date = ?',
      [rule.id, dueDate]
    );
    if (!generatedTask) return null;

    const generatedCount = Math.max(
      Number(rule.generated_count || 0),
      Number(generatedTask.recurrence_occurrence_index || nextOccurrenceIndex)
    );

    await runAsync(
      `UPDATE recurring_task_rules SET
         generated_count = GREATEST(generated_count, ?),
         last_generated_due_date = ?,
         next_due_date = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [generatedCount, dueDate, nextDueDate, rule.id]
    );
    await runAsync(
      'UPDATE tasks SET next_occurrence_date = ? WHERE recurring_rule_id = ? AND user_id = ?',
      [nextDueDate, rule.id, rule.user_id]
    );

    if (!inserted) return generatedTask;

    await recordAudit({
      userId: rule.user_id,
      actorUserId: actorUserId || rule.user_id,
      action: 'task_auto_generated',
      entityType: 'task',
      entityId: generatedTask.id,
      summary: generatedTask.title,
      after: generatedTask,
    });

    if (sendTaskAlertEmail && getUserById) {
      const user = await getUserById(rule.user_id);
      if (user) {
        await sendTaskAlertEmail(generatedTask, user, user.language || 'en');
      }
    }

    return generatedTask;
  };

  const processDueRules = async ({ limit = 100, now = new Date() } = {}) => {
    const dueRules = await findDueRules({ limit, now });
    const generated = [];
    for (const rule of dueRules) {
      const task = await generateNextTaskForRule(rule, { now });
      if (task) generated.push(task);
    }
    return { scanned: dueRules.length, generated };
  };

  return {
    calculateNextOccurrence,
    createRuleForTask,
    generateNextTaskForRule,
    normalizeRuleInput,
    processDueRules,
    setRuleStatusForTask,
    updateRuleForTask,
  };
};

module.exports = {
  calculateNextOccurrence,
  createRecurrenceService,
  getTodayYmd,
  normalizeRuleInput,
};
