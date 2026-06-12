const createSprintsService = ({ allAsync, getAsync, runAsync }) => {
  const sprintSelect = `
    SELECT s.*,
       s.user_id AS owner_user_id,
       owner.username AS owner_username,
       owner.name AS owner_name,
       COALESCE(editors.editors, '[]'::jsonb) AS editors,
       COALESCE(editors.editor_user_ids, ARRAY[]::integer[]) AS editor_user_ids,
       editor.user_id AS editor_user_id,
       editor.username AS editor_username,
       editor.name AS editor_name,
       CASE WHEN s.user_id = ? THEN 1 ELSE 0 END AS is_owner,
       CASE WHEN s.user_id = ? OR current_editor.user_id IS NOT NULL THEN 1 ELSE 0 END AS can_edit,
       (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.archived = 0) AS task_count
     FROM sprints s
     JOIN users owner ON owner.id = s.user_id
     LEFT JOIN LATERAL (
       SELECT
         jsonb_agg(
           jsonb_build_object(
             'id', u.id,
             'username', u.username,
             'name', u.name
           )
           ORDER BY COALESCE(u.name, u.username), u.id
         ) AS editors,
         array_agg(se.user_id ORDER BY COALESCE(u.name, u.username), u.id) AS editor_user_ids
       FROM sprint_editors se
       JOIN users u ON u.id = se.user_id
       WHERE se.sprint_id = s.id
     ) editors ON TRUE
     LEFT JOIN LATERAL (
       SELECT se.user_id, u.username, u.name
       FROM sprint_editors se
       JOIN users u ON u.id = se.user_id
       WHERE se.sprint_id = s.id
       ORDER BY se.created_at DESC, se.user_id ASC
       LIMIT 1
     ) editor ON TRUE
     LEFT JOIN sprint_editors current_editor
       ON current_editor.sprint_id = s.id
      AND current_editor.user_id = ?`;

  const listSprints = (userId, { archived = 0 } = {}) => allAsync(
    `${sprintSelect}
     WHERE s.archived = ?
       AND (s.user_id = ? OR current_editor.user_id IS NOT NULL)
     ORDER BY
       CASE s.status WHEN 'active' THEN 0 WHEN 'planned' THEN 1 ELSE 2 END,
       s.start_date DESC,
       s.id DESC`,
    [userId, userId, userId, archived ? 1 : 0, userId]
  );

  const getSprintForUser = (id, userId) => getAsync(
    `${sprintSelect}
     WHERE s.id = ? AND (s.user_id = ? OR current_editor.user_id IS NOT NULL)`,
    [userId, userId, userId, id, userId]
  );

  const getOwnedSprintForUser = (id, userId) => getAsync(
    `${sprintSelect}
     WHERE s.id = ? AND s.user_id = ?`,
    [userId, userId, userId, id, userId]
  );

  const replaceSprintEditors = async ({ sprintId, editorUserIds = [] }) => {
    const normalizedEditorUserIds = [...new Set(editorUserIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0))];

    await runAsync('DELETE FROM sprint_editors WHERE sprint_id = ?', [sprintId]);
    if (!normalizedEditorUserIds.length) return [];

    for (const editorUserId of normalizedEditorUserIds) {
      await runAsync(
        `INSERT INTO sprint_editors (sprint_id, user_id)
         VALUES (?, ?)
         ON CONFLICT (sprint_id, user_id) DO NOTHING
         RETURNING sprint_id`,
        [sprintId, editorUserId]
      );
    }
    return normalizedEditorUserIds;
  };

  const listAssignableEditors = (ids = []) => {
    const normalizedIds = [...new Set(ids
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0))];
    if (!normalizedIds.length) return [];
    return allAsync(
      `SELECT id, username, name, email, account_status
     FROM users
     WHERE id = ANY(?::int[]) AND account_status = 'enabled'`,
      [normalizedIds]
    );
  };

  const listSprintAccessUserIds = async (id) => {
    const rows = await allAsync(
      `SELECT DISTINCT user_id
       FROM (
         SELECT user_id FROM sprints WHERE id = ?
         UNION
         SELECT user_id FROM sprint_editors WHERE sprint_id = ?
       ) access_users
       WHERE user_id IS NOT NULL`,
      [id, id]
    );
    return rows.map((row) => Number(row.user_id)).filter(Number.isInteger);
  };

  const createSprint = async ({ userId, name, goal, startDate, endDate, status, editorUserIds = [] }) => {
    const result = await runAsync(
      `INSERT INTO sprints (user_id, name, goal, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [userId, name, goal || null, startDate || null, endDate || null, status || 'planned']
    );
    await replaceSprintEditors({ sprintId: result.lastID, editorUserIds });
    return getSprintForUser(result.lastID, userId);
  };

  const updateSprint = async ({ id, userId, name, goal, startDate, endDate, status, archived, editorUserIds, hasEditorUpdate = false }) => {
    await runAsync(
      `UPDATE sprints
       SET name = ?, goal = ?, start_date = ?, end_date = ?, status = ?,
           archived = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, goal || null, startDate || null, endDate || null, status, archived ? 1 : 0, id]
    );
    if (hasEditorUpdate) {
      await replaceSprintEditors({ sprintId: id, editorUserIds });
    }
    return getSprintForUser(id, userId);
  };

  const deleteSprint = (id, userId, { allowAnyOwner = false } = {}) => (
    allowAnyOwner
      ? runAsync('DELETE FROM sprints WHERE id = ?', [id])
      : runAsync('DELETE FROM sprints WHERE id = ? AND user_id = ?', [id, userId])
  );

  return {
    listSprints,
    getSprintForUser,
    getOwnedSprintForUser,
    listAssignableEditors,
    createSprint,
    listSprintAccessUserIds,
    replaceSprintEditors,
    updateSprint,
    deleteSprint,
  };
};

module.exports = { createSprintsService };
