const createSprintsService = ({ allAsync, getAsync, runAsync }) => {
  const listSprints = (userId) => allAsync(
    `SELECT s.*,
       (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.archived = 0) AS task_count
     FROM sprints s
     WHERE s.user_id = ?
     ORDER BY
       CASE s.status WHEN 'active' THEN 0 WHEN 'planned' THEN 1 ELSE 2 END,
       s.start_date DESC,
       s.id DESC`,
    [userId]
  );

  const getSprintForUser = (id, userId) => getAsync(
    `SELECT s.*,
       (SELECT COUNT(*) FROM tasks t WHERE t.sprint_id = s.id AND t.archived = 0) AS task_count
     FROM sprints s
     WHERE s.id = ? AND s.user_id = ?`,
    [id, userId]
  );

  const createSprint = async ({ userId, name, goal, startDate, endDate, status }) => {
    const result = await runAsync(
      `INSERT INTO sprints (user_id, name, goal, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [userId, name, goal || null, startDate || null, endDate || null, status || 'planned']
    );
    return getSprintForUser(result.lastID, userId);
  };

  const updateSprint = async ({ id, userId, name, goal, startDate, endDate, status }) => {
    await runAsync(
      `UPDATE sprints
       SET name = ?, goal = ?, start_date = ?, end_date = ?, status = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [name, goal || null, startDate || null, endDate || null, status, id, userId]
    );
    return getSprintForUser(id, userId);
  };

  const deleteSprint = (id, userId) =>
    runAsync('DELETE FROM sprints WHERE id = ? AND user_id = ?', [id, userId]);

  return {
    listSprints,
    getSprintForUser,
    createSprint,
    updateSprint,
    deleteSprint,
  };
};

module.exports = { createSprintsService };
