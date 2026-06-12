const { TASK_PRIORITY_ORDER_SQL } = require('../constants/tasks');
const { normalizeTag } = require('../utils/tasks');

const createTasksService = ({ allAsync, getAsync, runAsync }) => {
  const attachActivityHistory = async (userId, rows) => {
    if (!rows.length) return rows;

    const taskIds = rows.map((task) => Number(task.id));
    const placeholders = taskIds.map(() => '?').join(', ');
    const historyRows = await allAsync(
      `SELECT
         audit_logs.entity_id AS task_id,
         audit_logs.action,
         audit_logs.summary,
         audit_logs.before_data,
         audit_logs.after_data,
         audit_logs.created_at,
         actor.username AS actor_username,
         actor.name AS actor_name
       FROM audit_logs
       LEFT JOIN users actor ON actor.id = audit_logs.actor_user_id
       JOIN tasks audit_task ON audit_task.id = audit_logs.entity_id
       WHERE audit_logs.user_id = audit_task.user_id
         AND audit_logs.entity_type = 'task'
         AND audit_logs.entity_id IN (${placeholders})
       ORDER BY audit_logs.created_at ASC, audit_logs.id ASC`,
      taskIds
    );

    const historyByTaskId = historyRows.reduce((map, row) => {
      const key = Number(row.task_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        action: row.action,
        summary: row.summary,
        before: row.before_data || null,
        after: row.after_data || null,
        created_at: row.created_at,
        actor: row.actor_name || row.actor_username || '',
      });
      return map;
    }, new Map());

    return rows.map((task) => ({
      ...task,
      activity_history: historyByTaskId.get(Number(task.id)) || [],
    }));
  };

  const attachRelatedTasks = async (userId, rows, { includeActivityHistory = true } = {}) => {
    if (!rows.length) return rows;

    const taskIds = rows.map((task) => Number(task.id));
    const placeholders = taskIds.map(() => '?').join(', ');
    const relatedRows = await allAsync(
      `SELECT * FROM (
         SELECT relation.task_id, related.id, related.title, related.status, related.archived
         FROM task_related_tasks relation
         JOIN tasks related ON related.id = relation.related_task_id
         LEFT JOIN sprints related_sprint ON related_sprint.id = related.sprint_id
         LEFT JOIN sprint_editors related_editor
           ON related_editor.sprint_id = related.sprint_id
          AND related_editor.user_id = ?
         WHERE relation.task_id IN (${placeholders})
           AND (related.user_id = ? OR related_sprint.user_id = ? OR related_editor.user_id IS NOT NULL)
         UNION
         SELECT relation.related_task_id AS task_id, related.id, related.title, related.status, related.archived
         FROM task_related_tasks relation
         JOIN tasks related ON related.id = relation.task_id
         LEFT JOIN sprints related_sprint ON related_sprint.id = related.sprint_id
         LEFT JOIN sprint_editors related_editor
           ON related_editor.sprint_id = related.sprint_id
          AND related_editor.user_id = ?
         WHERE relation.related_task_id IN (${placeholders})
           AND (related.user_id = ? OR related_sprint.user_id = ? OR related_editor.user_id IS NOT NULL)
       ) related_union
       ORDER BY task_id, LOWER(title), id`,
      [userId, ...taskIds, userId, userId, userId, ...taskIds, userId, userId]
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

    const withRelatedTasks = rows.map((task) => ({
      ...task,
      related_tasks: relatedByTaskId.get(Number(task.id)) || [],
      related_task_ids: (relatedByTaskId.get(Number(task.id)) || []).map((related) => related.id),
    }));

    // Activity history (audit log before/after snapshots) can be very large and
    // is only needed in the task detail/preview view, so it is skipped for the
    // task list to keep the response small.
    if (!includeActivityHistory) {
      return withRelatedTasks.map((task) => ({ ...task, activity_history: [] }));
    }

    return attachActivityHistory(userId, withRelatedTasks);
  };

  const listTasks = async ({ userId, archived = 0 }) => {
    const rows = await allAsync(
      `SELECT tasks.*,
              rules.status AS recurrence_rule_status,
              sprint.user_id AS sprint_owner_user_id,
              CASE WHEN tasks.user_id = ? THEN 1 ELSE 0 END AS can_delete,
              CASE WHEN tasks.user_id = ? OR sprint.user_id = ? OR task_editor.user_id IS NOT NULL THEN 1 ELSE 0 END AS can_edit
       FROM tasks
       LEFT JOIN recurring_task_rules rules ON rules.id = tasks.recurring_rule_id
       LEFT JOIN sprints sprint ON sprint.id = tasks.sprint_id
       LEFT JOIN sprint_editors task_editor
         ON task_editor.sprint_id = tasks.sprint_id
        AND task_editor.user_id = ?
       WHERE tasks.archived = ?
         AND (tasks.user_id = ? OR sprint.user_id = ? OR task_editor.user_id IS NOT NULL)
       ORDER BY ${TASK_PRIORITY_ORDER_SQL}`,
      [userId, userId, userId, userId, archived, userId, userId]
    );

    // Strip the heavy attachment_data (base64 file contents) from the list.
    // Returning it for every task can balloon the response to tens of MB and
    // stall other requests in the browser (connection limit). The list keeps
    // attachment metadata via a has_attachment flag; the actual file data is
    // fetched on demand through getTaskForUser (GET /api/tasks/:id).
    const lightRows = rows.map(({ attachment_data, ...rest }) => ({
      ...rest,
      has_attachment: Boolean(attachment_data),
    }));

    return attachRelatedTasks(userId, lightRows, { includeActivityHistory: false });
  };

  const listAllTasksForEmail = (userId) => allAsync(
    `SELECT * FROM tasks
     WHERE user_id = ?
     ORDER BY ${TASK_PRIORITY_ORDER_SQL}`,
    [userId]
  );

  const getTaskForUser = async (id, userId, { includeActivityHistory = true } = {}) => {
    const task = await getAsync(
      `SELECT tasks.*,
              rules.status AS recurrence_rule_status,
              sprint.user_id AS sprint_owner_user_id,
              CASE WHEN tasks.user_id = ? THEN 1 ELSE 0 END AS can_delete,
              CASE WHEN tasks.user_id = ? OR sprint.user_id = ? OR task_editor.user_id IS NOT NULL THEN 1 ELSE 0 END AS can_edit
       FROM tasks
       LEFT JOIN recurring_task_rules rules ON rules.id = tasks.recurring_rule_id
       LEFT JOIN sprints sprint ON sprint.id = tasks.sprint_id
       LEFT JOIN sprint_editors task_editor
         ON task_editor.sprint_id = tasks.sprint_id
        AND task_editor.user_id = ?
       WHERE tasks.id = ?
         AND (tasks.user_id = ? OR sprint.user_id = ? OR task_editor.user_id IS NOT NULL)`,
      [userId, userId, userId, userId, id, userId, userId]
    );
    if (!task) return null;
    return (await attachRelatedTasks(userId, [task], { includeActivityHistory }))[0];
  };

  const getTaskById = (id) => getAsync('SELECT * FROM tasks WHERE id = ?', [id]);

  const getAccessibleSprintForUser = (id, userId) => getAsync(
    `SELECT s.*
     FROM sprints s
     LEFT JOIN sprint_editors editor
       ON editor.sprint_id = s.id
      AND editor.user_id = ?
     WHERE s.id = ?
       AND (s.user_id = ? OR editor.user_id IS NOT NULL)`,
    [userId, id, userId]
  );

  const listTaskAccessUserIds = async (id) => {
    const rows = await allAsync(
      `SELECT DISTINCT user_id
       FROM (
         SELECT tasks.user_id
         FROM tasks
         WHERE tasks.id = ?
         UNION
         SELECT sprints.user_id
         FROM tasks
         JOIN sprints ON sprints.id = tasks.sprint_id
         WHERE tasks.id = ?
         UNION
         SELECT sprint_editors.user_id
         FROM tasks
         JOIN sprint_editors ON sprint_editors.sprint_id = tasks.sprint_id
         WHERE tasks.id = ?
       ) access_users
       WHERE user_id IS NOT NULL`,
      [id, id, id]
    );
    return rows.map((row) => Number(row.user_id)).filter(Number.isInteger);
  };

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
    recurrenceTimezone,
    recurrenceEndDate,
    recurrenceOccurrenceLimit,
    recurringRuleId,
    recurrenceOccurrenceIndex,
    parentTaskId,
    nextOccurrenceDate,
    relatedTaskIds,
    sprintId,
  }) => {
    const result = await runAsync(
      `INSERT INTO tasks (
        user_id, title, tag, description, comment, priority, status, completed, time_spent_minutes, due_date, reminder_at,
        attachment_name, attachment_type, attachment_data, attachment_size,
        is_recurring, recurrence_pattern, recurrence_interval, recurrence_days, recurrence_timezone,
        recurrence_end_date, recurrence_occurrence_limit, recurring_rule_id, recurrence_occurrence_index,
        parent_task_id, next_occurrence_date, sprint_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
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
        recurrenceTimezone || null,
        recurrenceEndDate || null,
        recurrenceOccurrenceLimit || null,
        recurringRuleId || null,
        recurrenceOccurrenceIndex || null,
        parentTaskId || null,
        nextOccurrenceDate || null,
        sprintId || null,
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
    recurrenceTimezone,
    recurrenceEndDate,
    recurrenceOccurrenceLimit,
    hasRelatedTaskUpdate,
    relatedTaskIds,
    hasSprintUpdate,
    sprintId,
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
        recurrence_timezone = ?,
        recurrence_end_date = ?,
        recurrence_occurrence_limit = ?,
        sprint_id = ?,
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
        recurrenceTimezone !== undefined ? recurrenceTimezone : existingTask.recurrence_timezone,
        recurrenceEndDate !== undefined ? recurrenceEndDate : existingTask.recurrence_end_date,
        recurrenceOccurrenceLimit !== undefined ? recurrenceOccurrenceLimit : existingTask.recurrence_occurrence_limit,
        hasSprintUpdate ? sprintId : existingTask.sprint_id,
        id,
        existingTask.user_id
      ]
    );

    if (hasRelatedTaskUpdate) {
      await setRelatedTasks({ userId: existingTask.user_id, taskId: id, relatedTaskIds });
    }

    return getTaskForUser(id, existingTask.user_id, { includeActivityHistory: false });
  };

  const deleteTask = (id, userId) => runAsync('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);

  return {
    createTask,
    deleteTag,
    deleteTask,
    ensureTaskTag,
    findTagByNormalizedName,
    getAccessibleSprintForUser,
    getTagForUser,
    getTaskForUser,
    listTaskAccessUserIds,
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
