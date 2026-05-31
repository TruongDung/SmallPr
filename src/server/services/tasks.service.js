const { TASK_PRIORITY_ORDER_SQL } = require('../constants/tasks');
const { normalizeTag } = require('../utils/tasks');

const createTasksService = ({ allAsync, getAsync, runAsync }) => {
  const listTasks = ({ userId, archived = 0 }) => allAsync(
    `SELECT * FROM tasks
     WHERE user_id = ? AND archived = ?
     ORDER BY ${TASK_PRIORITY_ORDER_SQL}`,
    [userId, archived]
  );

  const listAllTasksForEmail = (userId) => allAsync(
    `SELECT * FROM tasks
     WHERE user_id = ?
     ORDER BY ${TASK_PRIORITY_ORDER_SQL}`,
    [userId]
  );

  const getTaskForUser = (id, userId) => getAsync(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  const getTaskById = (id) => getAsync('SELECT * FROM tasks WHERE id = ?', [id]);

  const listTags = (userId) => allAsync(
    'SELECT id, name FROM task_tags WHERE user_id = ? ORDER BY LOWER(name), name',
    [userId]
  );

  const ensureTaskTag = async (userId, tag) => {
    const normalizedTag = normalizeTag(tag);
    if (!normalizedTag) {
      return null;
    }

    const normalizedName = normalizedTag.toLowerCase();
    await runAsync(
      `INSERT INTO task_tags (user_id, name, normalized_name)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id, normalized_name) DO NOTHING
       RETURNING id`,
      [userId, normalizedTag, normalizedName]
    );
    return getAsync(
      'SELECT id, name FROM task_tags WHERE user_id = ? AND normalized_name = ?',
      [userId, normalizedName]
    );
  };

  const getTagForUser = (id, userId) => getAsync(
    'SELECT id, name FROM task_tags WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  const findTagByNormalizedName = (userId, normalizedName) => getAsync(
    'SELECT id, name FROM task_tags WHERE user_id = ? AND normalized_name = ?',
    [userId, normalizedName]
  );

  const mergeTagIntoExisting = async ({ userId, oldName, existingTag, tagId }) => {
    await runAsync('UPDATE tasks SET tag = ? WHERE user_id = ? AND LOWER(tag) = LOWER(?)', [existingTag.name, userId, oldName]);
    await runAsync('DELETE FROM task_tags WHERE id = ? AND user_id = ?', [tagId, userId]);
    return existingTag;
  };

  const updateTag = async ({ id, userId, name, previousName }) => {
    const normalizedName = name.toLowerCase();
    await runAsync(
      'UPDATE task_tags SET name = ?, normalized_name = ? WHERE id = ? AND user_id = ?',
      [name, normalizedName, id, userId]
    );
    await runAsync('UPDATE tasks SET tag = ? WHERE user_id = ? AND LOWER(tag) = LOWER(?)', [name, userId, previousName]);
    return getTagForUser(id, userId);
  };

  const deleteTag = async ({ id, userId, name }) => {
    await runAsync('UPDATE tasks SET tag = ? WHERE user_id = ? AND LOWER(tag) = LOWER(?)', ['', userId, name]);
    await runAsync('DELETE FROM task_tags WHERE id = ? AND user_id = ?', [id, userId]);
  };

  const createTask = async ({
    userId,
    title,
    tag,
    description,
    comment,
    priority,
    status,
    timeSpentMinutes,
    reminderAt,
    attachment,
    isRecurring,
    recurrencePattern,
    recurrenceInterval,
    recurrenceDays,
    parentTaskId,
    nextOccurrenceDate
  }) => {
    const result = await runAsync(
      `INSERT INTO tasks (
        user_id, title, tag, description, comment, priority, status, completed, time_spent_minutes, reminder_at,
        attachment_name, attachment_type, attachment_data, attachment_size,
        is_recurring, recurrence_pattern, recurrence_interval, recurrence_days, parent_task_id, next_occurrence_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        userId,
        title,
        tag,
        description || '',
        comment || '',
        priority,
        status,
        status === 'done' ? 1 : 0,
        timeSpentMinutes || 0,
        reminderAt || null,
        attachment?.name || null,
        attachment?.type || null,
        attachment?.data || null,
        attachment?.size || 0,
        isRecurring || false,
        recurrencePattern || null,
        recurrenceInterval || null,
        recurrenceDays || null,
        parentTaskId || null,
        nextOccurrenceDate || null
      ]
    );

    return getTaskById(result.lastID);
  };

  const updateTask = async ({
    id,
    userId,
    existingTask,
    title,
    tag,
    hasTagUpdate,
    description,
    comment,
    priority,
    status,
    archived,
    timeSpentMinutes,
    reminderAt,
    hasAttachmentUpdate,
    attachment,
    isRecurring,
    recurrencePattern,
    recurrenceInterval,
    recurrenceDays
  }) => {
    await runAsync(
      `UPDATE tasks SET
        title = ?,
        tag = ?,
        description = ?,
        comment = ?,
        priority = ?,
        status = ?,
        archived = ?,
        completed = ?,
        time_spent_minutes = ?,
        reminder_at = ?,
        attachment_name = ?,
        attachment_type = ?,
        attachment_data = ?,
        attachment_size = ?,
        is_recurring = ?,
        recurrence_pattern = ?,
        recurrence_interval = ?,
        recurrence_days = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        title || existingTask.title,
        hasTagUpdate ? tag : existingTask.tag,
        description !== undefined ? description : existingTask.description,
        comment !== undefined ? comment : existingTask.comment,
        priority,
        status,
        archived !== undefined ? (archived ? 1 : 0) : existingTask.archived,
        status === 'done' ? 1 : 0,
        timeSpentMinutes !== undefined ? timeSpentMinutes : existingTask.time_spent_minutes,
        reminderAt !== undefined ? reminderAt || null : existingTask.reminder_at,
        hasAttachmentUpdate ? attachment?.name || null : existingTask.attachment_name,
        hasAttachmentUpdate ? attachment?.type || null : existingTask.attachment_type,
        hasAttachmentUpdate ? attachment?.data || null : existingTask.attachment_data,
        hasAttachmentUpdate ? attachment?.size || 0 : existingTask.attachment_size,
        isRecurring !== undefined ? isRecurring : existingTask.is_recurring,
        recurrencePattern !== undefined ? recurrencePattern : existingTask.recurrence_pattern,
        recurrenceInterval !== undefined ? recurrenceInterval : existingTask.recurrence_interval,
        recurrenceDays !== undefined ? recurrenceDays : existingTask.recurrence_days,
        id,
        userId
      ]
    );

    return getTaskById(id);
  };

  const deleteTask = (id, userId) => runAsync('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);

  return {
    createTask,
    deleteTag,
    deleteTask,
    ensureTaskTag,
    findTagByNormalizedName,
    getTagForUser,
    getTaskForUser,
    listAllTasksForEmail,
    listTags,
    listTasks,
    mergeTagIntoExisting,
    updateTag,
    updateTask,
  };
};

module.exports = {
  createTasksService,
};
