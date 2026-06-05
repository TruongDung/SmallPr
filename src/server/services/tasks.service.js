const { TASK_PRIORITY_ORDER_SQL } = require('../constants/tasks');
const { normalizeTag } = require('../utils/tasks');

const createTasksService = ({ allAsync, getAsync, runAsync }) => {
  const attachRelatedTasks = async (userId, rows) => {
    if (!rows.length) return rows;

    const taskIds = rows.map((task) => Number(task.id));
    const placeholders = taskIds.map(() => '?').join(', ');
    const relatedRows = await allAsync(
      `SELECT * FROM (
         SELECT relation.task_id, related.id, related.title, related.status, related.archived
         FROM task_related_tasks relation
         JOIN tasks related ON related.id = relation.related_task_id AND related.user_id = relation.user_id
         WHERE relation.user_id = ? AND relation.task_id IN (${placeholders})
         UNION
         SELECT relation.related_task_id AS task_id, related.id, related.title, related.status, related.archived
         FROM task_related_tasks relation
         JOIN tasks related ON related.id = relation.task_id AND related.user_id = relation.user_id
         WHERE relation.user_id = ? AND relation.related_task_id IN (${placeholders})
       ) related_union
       ORDER BY task_id, LOWER(title), id`,
      [userId, ...taskIds, userId, ...taskIds]
    );

    const relatedByTaskId = relatedRows.reduce((map, row) => {
      const key = Number(row.task_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        id: row.id,
        title: row.title,
        status: row.status,
        archived: row.archived,
      });
      return map;
    }, new Map());

    return rows.map((task) => ({
      ...task,
      related_tasks: relatedByTaskId.get(Number(task.id)) || [],
      related_task_ids: (relatedByTaskId.get(Number(task.id)) || []).map((related) => related.id),
    }));
  };

  const listTasks = async ({ userId, archived = 0 }) => {
    const rows = await allAsync(
      `SELECT * FROM tasks
       WHERE user_id = ? AND archived = ?
       ORDER BY ${TASK_PRIORITY_ORDER_SQL}`,
      [userId, archived]
    );
    return attachRelatedTasks(userId, rows);
  };

  const listAllTasksForEmail = (userId) => allAsync(
    `SELECT * FROM tasks
     WHERE user_id = ?
     ORDER BY ${TASK_PRIORITY_ORDER_SQL}`,
    [userId]
  );

  const getTaskForUser = async (id, userId) => {
    const task = await getAsync(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!task) return null;
    return (await attachRelatedTasks(userId, [task]))[0];
  };

  const getTaskById = (id) => getAsync('SELECT * FROM tasks WHERE id = ?', [id]);

  const setRelatedTasks = async ({ userId, taskId, relatedTaskIds = [] }) => {
    const normalizedIds = [...new Set(relatedTaskIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0 && Number(id) !== Number(taskId)))];

    await runAsync(
      'DELETE FROM task_related_tasks WHERE user_id = ? AND (task_id = ? OR related_task_id = ?)',
      [userId, taskId, taskId]
    );

    if (!normalizedIds.length) return;

    const placeholders = normalizedIds.map(() => '?').join(', ');
    const ownedRows = await allAsync(
      `SELECT id FROM tasks WHERE user_id = ? AND id IN (${placeholders})`,
      [userId, ...normalizedIds]
    );
    const ownedIds = ownedRows.map((row) => Number(row.id));

    for (const relatedTaskId of ownedIds) {
      await runAsync(
        `INSERT INTO task_related_tasks (user_id, task_id, related_task_id)
         VALUES (?, ?, ?)
         ON CONFLICT (task_id, related_task_id) DO NOTHING
         RETURNING task_id`,
        [userId, taskId, relatedTaskId]
      );
      await runAsync(
        `INSERT INTO task_related_tasks (user_id, task_id, related_task_id)
         VALUES (?, ?, ?)
         ON CONFLICT (task_id, related_task_id) DO NOTHING
         RETURNING task_id`,
        [userId, relatedTaskId, taskId]
      );
    }
  };

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
    dueDate,
    reminderAt,
    attachment,
    isRecurring,
    recurrencePattern,
    recurrenceInterval,
    recurrenceDays,
    parentTaskId,
    nextOccurrenceDate,
    relatedTaskIds,
  }) => {
    const result = await runAsync(
      `INSERT INTO tasks (
        user_id, title, tag, description, comment, priority, status, completed, time_spent_minutes, due_date, reminder_at,
        attachment_name, attachment_type, attachment_data, attachment_size,
        is_recurring, recurrence_pattern, recurrence_interval, recurrence_days, parent_task_id, next_occurrence_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
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
        dueDate || null,
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

    await setRelatedTasks({ userId, taskId: result.lastID, relatedTaskIds });
    return getTaskForUser(result.lastID, userId);
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
    dueDate,
    reminderAt,
    hasAttachmentUpdate,
    attachment,
    isRecurring,
    recurrencePattern,
    recurrenceInterval,
    recurrenceDays,
    hasRelatedTaskUpdate,
    relatedTaskIds
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
        due_date = ?,
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
        dueDate !== undefined ? dueDate || null : existingTask.due_date,
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

    if (hasRelatedTaskUpdate) {
      await setRelatedTasks({ userId, taskId: id, relatedTaskIds });
    }

    return getTaskForUser(id, userId);
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
