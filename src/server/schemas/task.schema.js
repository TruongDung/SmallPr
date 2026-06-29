const { MAX_TAG_LENGTH, MAX_TASK_TEXT_LENGTH, MAX_TASK_TITLE_LENGTH } = require('../constants/tasks');
const { normalizePriority, normalizeStatus, normalizeTag, parseAttachment, stripHtml } = require('../utils/tasks');

const taskError = (message) => ({ error: message });
const RECURRENCE_PATTERNS = new Set(['daily', 'weekly', 'monthly', 'yearly']);

const isSupportedTimezone = (timezone) => {
  if (!timezone) return true;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

const normalizeDate = (value) => {
  if (!value) return null;
  return String(value).slice(0, 10);
};

const normalizeWeekdays = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const entries = Array.isArray(value) ? value : String(value).split(',');
  const days = [
    ...new Set(
      entries.map((entry) => Number(entry)).filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 6),
    ),
  ].sort((a, b) => a - b);
  return days.length ? days.join(',') : null;
};

const normalizeRecurrence = ({
  isRecurring,
  recurrencePattern,
  recurrenceInterval,
  recurrenceDays,
  recurrenceTimezone,
  recurrenceEndDate,
  recurrenceOccurrenceLimit,
  dueDate,
  allowUndefined = false,
}) => {
  if (allowUndefined && isRecurring === undefined) {
    return {
      isRecurring,
      recurrencePattern,
      recurrenceInterval,
      recurrenceDays,
      recurrenceTimezone,
      recurrenceEndDate,
      recurrenceOccurrenceLimit,
    };
  }

  if (!isRecurring) {
    return {
      isRecurring: Boolean(isRecurring),
      recurrencePattern: null,
      recurrenceInterval: null,
      recurrenceDays: null,
      recurrenceTimezone: null,
      recurrenceEndDate: null,
      recurrenceOccurrenceLimit: null,
    };
  }

  const pattern = String(recurrencePattern || '').trim();
  if (!RECURRENCE_PATTERNS.has(pattern)) {
    return taskError('Recurrence frequency must be daily, weekly, monthly, or yearly');
  }

  const interval = Math.max(1, Number(recurrenceInterval || 1) || 1);
  if (interval > 365) {
    return taskError('Recurrence interval must be 365 or less');
  }

  const weekdays = normalizeWeekdays(recurrenceDays);
  if (pattern === 'weekly' && !weekdays) {
    return taskError('Weekly recurrence requires at least one weekday');
  }

  const timezone = String(recurrenceTimezone || '').trim() || 'UTC';
  if (!isSupportedTimezone(timezone)) {
    return taskError('Recurrence timezone is invalid');
  }

  const startDate = normalizeDate(dueDate);
  if (!startDate) {
    return taskError('Due date is required for recurring tasks');
  }

  const occurrenceLimit =
    recurrenceOccurrenceLimit === undefined || recurrenceOccurrenceLimit === null || recurrenceOccurrenceLimit === ''
      ? null
      : Number(recurrenceOccurrenceLimit);
  if (occurrenceLimit !== null && (!Number.isInteger(occurrenceLimit) || occurrenceLimit <= 0)) {
    return taskError('Recurrence occurrence limit must be a positive number');
  }

  return {
    isRecurring: true,
    recurrencePattern: pattern,
    recurrenceInterval: interval,
    recurrenceDays: pattern === 'weekly' ? weekdays : null,
    recurrenceTimezone: timezone,
    recurrenceEndDate: normalizeDate(recurrenceEndDate),
    recurrenceOccurrenceLimit: occurrenceLimit,
  };
};

const normalizeRelatedTaskIds = (value) => {
  if (value === undefined) {
    return { hasRelatedTaskUpdate: false, relatedTaskIds: undefined };
  }

  if (value === null || value === '') {
    return { hasRelatedTaskUpdate: true, relatedTaskIds: [] };
  }

  if (!Array.isArray(value)) {
    return { error: 'Related tasks must be an array' };
  }

  const ids = [...new Set(value.map((entry) => Number(entry)).filter((entry) => Number.isInteger(entry) && entry > 0))];

  if (ids.length > 25) {
    return { error: 'Related tasks must include 25 tasks or less' };
  }

  return { hasRelatedTaskUpdate: true, relatedTaskIds: ids };
};

const validateTagName = (value) => {
  const name = normalizeTag(value);
  if (!name) {
    return taskError('Tag name is required');
  }
  if (name.length > MAX_TAG_LENGTH) {
    return taskError(`Tag name must be ${MAX_TAG_LENGTH} characters or less`);
  }
  return { value: name };
};

const validateCreateTask = (body = {}) => {
  const {
    title,
    tag,
    description,
    comment,
    priority,
    status,
    time_spent_minutes,
    due_date,
    reminder_at,
    attachment,
    language,
    is_recurring,
    recurrence_pattern,
    recurrence_interval,
    recurrence_days,
    recurrence_timezone,
    recurrence_end_date,
    recurrence_occurrence_limit,
    related_task_ids,
    sprint_id,
  } = body;

  if (!title) {
    return taskError('Task title is required');
  }

  const normalizedTag = normalizeTag(tag);
  if (normalizedTag.length > MAX_TAG_LENGTH) {
    return taskError(`Task tag must be ${MAX_TAG_LENGTH} characters or less`);
  }

  const normalizedPriority = normalizePriority(priority);
  if (!normalizedPriority) {
    return taskError('Task priority must be low, medium, or high');
  }

  const normalizedStatus = normalizeStatus(status);
  if (!normalizedStatus) {
    return taskError('Task status must be todo, in_progress, or done');
  }

  if (title.length > MAX_TASK_TITLE_LENGTH) {
    return taskError(`Task title must be ${MAX_TASK_TITLE_LENGTH} characters or less`);
  }

  if (description && stripHtml(description).length > MAX_TASK_TEXT_LENGTH) {
    return taskError(`Task description must be ${MAX_TASK_TEXT_LENGTH} characters or less`);
  }

  if (comment && String(comment).length > MAX_TASK_TEXT_LENGTH) {
    return taskError(`Task comment must be ${MAX_TASK_TEXT_LENGTH} characters or less`);
  }

  let parsedAttachment = null;
  try {
    parsedAttachment = parseAttachment(attachment);
  } catch (attachmentError) {
    return taskError(attachmentError.message);
  }

  const relatedTasks = normalizeRelatedTaskIds(related_task_ids);
  if (relatedTasks.error) {
    return taskError(relatedTasks.error);
  }

  const recurrence = normalizeRecurrence({
    isRecurring: is_recurring,
    recurrencePattern: recurrence_pattern,
    recurrenceInterval: recurrence_interval,
    recurrenceDays: recurrence_days,
    recurrenceTimezone: recurrence_timezone,
    recurrenceEndDate: recurrence_end_date,
    recurrenceOccurrenceLimit: recurrence_occurrence_limit,
    dueDate: due_date,
  });
  if (recurrence.error) {
    return taskError(recurrence.error);
  }

  const normalizedSprintId =
    sprint_id !== undefined && sprint_id !== null && sprint_id !== '' ? Number(sprint_id) : null;
  if (normalizedSprintId !== null && !Number.isInteger(normalizedSprintId)) {
    return taskError('Sprint ID must be a valid number');
  }

  return {
    value: {
      title,
      tag: normalizedTag,
      description,
      comment,
      priority: normalizedPriority,
      status: normalizedStatus,
      timeSpentMinutes: time_spent_minutes,
      dueDate: due_date || null,
      reminderAt: reminder_at,
      attachment: parsedAttachment,
      language,
      ...recurrence,
      relatedTaskIds: relatedTasks.relatedTaskIds || [],
      sprintId: normalizedSprintId,
    },
  };
};

const validateUpdateTask = (body = {}, existingTask) => {
  const {
    title,
    tag,
    description,
    comment,
    priority,
    status,
    archived,
    completed,
    time_spent_minutes,
    due_date,
    reminder_at,
    attachment,
    is_recurring,
    recurrence_pattern,
    recurrence_interval,
    recurrence_days,
    recurrence_timezone,
    recurrence_end_date,
    recurrence_occurrence_limit,
    related_task_ids,
    sprint_id,
  } = body;
  const hasAttachmentUpdate = Object.prototype.hasOwnProperty.call(body, 'attachment');
  const hasStatusUpdate = Object.prototype.hasOwnProperty.call(body, 'status');
  const hasTagUpdate = Object.prototype.hasOwnProperty.call(body, 'tag');
  const hasSprintUpdate = Object.prototype.hasOwnProperty.call(body, 'sprint_id');

  if (title !== undefined && title.length > MAX_TASK_TITLE_LENGTH) {
    return taskError(`Task title must be ${MAX_TASK_TITLE_LENGTH} characters or less`);
  }

  const normalizedTag = normalizeTag(tag);
  if (hasTagUpdate && normalizedTag.length > MAX_TAG_LENGTH) {
    return taskError(`Task tag must be ${MAX_TAG_LENGTH} characters or less`);
  }

  if (description && stripHtml(description).length > MAX_TASK_TEXT_LENGTH) {
    return taskError(`Task description must be ${MAX_TASK_TEXT_LENGTH} characters or less`);
  }

  if (comment && String(comment).length > MAX_TASK_TEXT_LENGTH) {
    return taskError(`Task comment must be ${MAX_TASK_TEXT_LENGTH} characters or less`);
  }

  const normalizedPriority = normalizePriority(priority, existingTask.priority || 'medium');
  if (!normalizedPriority) {
    return taskError('Task priority must be low, medium, or high');
  }

  let normalizedStatus = normalizeStatus(status, existingTask.status || (existingTask.completed ? 'done' : 'todo'));
  if (hasStatusUpdate && !normalizedStatus) {
    return taskError('Task status must be todo, in_progress, or done');
  }
  if (!hasStatusUpdate && completed !== undefined) {
    normalizedStatus = completed ? 'done' : 'todo';
  }

  let parsedAttachment = null;
  if (hasAttachmentUpdate) {
    try {
      parsedAttachment = parseAttachment(attachment);
    } catch (attachmentError) {
      return taskError(attachmentError.message);
    }
  }

  const relatedTasks = normalizeRelatedTaskIds(related_task_ids);
  if (relatedTasks.error) {
    return taskError(relatedTasks.error);
  }

  const hasRecurringUpdate = Object.prototype.hasOwnProperty.call(body, 'is_recurring');
  const recurrence = normalizeRecurrence({
    isRecurring: is_recurring,
    recurrencePattern: recurrence_pattern,
    recurrenceInterval: recurrence_interval,
    recurrenceDays: recurrence_days,
    recurrenceTimezone: recurrence_timezone,
    recurrenceEndDate: recurrence_end_date,
    recurrenceOccurrenceLimit: recurrence_occurrence_limit,
    dueDate: due_date !== undefined ? due_date : existingTask.due_date,
    allowUndefined: !hasRecurringUpdate,
  });
  if (recurrence.error) {
    return taskError(recurrence.error);
  }

  let normalizedSprintId = undefined;
  if (hasSprintUpdate) {
    normalizedSprintId = sprint_id !== undefined && sprint_id !== null && sprint_id !== '' ? Number(sprint_id) : null;
    if (normalizedSprintId !== null && !Number.isInteger(normalizedSprintId)) {
      return taskError('Sprint ID must be a valid number');
    }
  }

  return {
    value: {
      title,
      tag: normalizedTag,
      hasTagUpdate,
      description,
      comment,
      priority: normalizedPriority,
      status: normalizedStatus,
      archived,
      timeSpentMinutes: time_spent_minutes,
      dueDate: due_date,
      reminderAt: reminder_at,
      hasAttachmentUpdate,
      attachment: parsedAttachment,
      ...recurrence,
      recurrenceScope: body.recurrence_scope === 'single' ? 'single' : 'future',
      hasRelatedTaskUpdate: relatedTasks.hasRelatedTaskUpdate,
      relatedTaskIds: relatedTasks.relatedTaskIds,
      hasSprintUpdate,
      sprintId: normalizedSprintId,
    },
  };
};

module.exports = {
  validateCreateTask,
  validateTagName,
  validateUpdateTask,
};
