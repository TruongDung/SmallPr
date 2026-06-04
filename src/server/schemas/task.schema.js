const {
  MAX_TAG_LENGTH,
  MAX_TASK_TEXT_LENGTH,
  MAX_TASK_TITLE_LENGTH,
} = require('../constants/tasks');
const {
  normalizePriority,
  normalizeStatus,
  normalizeTag,
  parseAttachment,
  stripHtml,
} = require('../utils/tasks');

const taskError = (message) => ({ error: message });

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

  const ids = [...new Set(value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0))];

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
    reminder_at,
    attachment,
    language,
    is_recurring,
    recurrence_pattern,
    recurrence_interval,
    recurrence_days,
    related_task_ids,
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

  return {
    value: {
      title,
      tag: normalizedTag,
      description,
      comment,
      priority: normalizedPriority,
      status: normalizedStatus,
      timeSpentMinutes: time_spent_minutes,
      reminderAt: reminder_at,
      attachment: parsedAttachment,
      language,
      isRecurring: is_recurring || false,
      recurrencePattern: recurrence_pattern || null,
      recurrenceInterval: recurrence_interval || null,
      recurrenceDays: recurrence_days || null,
      relatedTaskIds: relatedTasks.relatedTaskIds || [],
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
    reminder_at,
    attachment,
    is_recurring,
    recurrence_pattern,
    recurrence_interval,
    recurrence_days,
    related_task_ids,
  } = body;
  const hasAttachmentUpdate = Object.prototype.hasOwnProperty.call(body, 'attachment');
  const hasStatusUpdate = Object.prototype.hasOwnProperty.call(body, 'status');
  const hasTagUpdate = Object.prototype.hasOwnProperty.call(body, 'tag');

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
      reminderAt: reminder_at,
      hasAttachmentUpdate,
      attachment: parsedAttachment,
      isRecurring: is_recurring,
      recurrencePattern: recurrence_pattern,
      recurrenceInterval: recurrence_interval,
      recurrenceDays: recurrence_days,
      hasRelatedTaskUpdate: relatedTasks.hasRelatedTaskUpdate,
      relatedTaskIds: relatedTasks.relatedTaskIds,
    },
  };
};

module.exports = {
  validateCreateTask,
  validateTagName,
  validateUpdateTask,
};
