const createEvaluationRepository = ({ allAsync, getAsync, runAsync }) => {
  const saveRun = async (report) => {
    const result = await runAsync(
      `INSERT INTO ai_evaluation_runs
        (feature, status, summary, report, started_at, completed_at)
       VALUES (?, ?, ?::jsonb, ?::jsonb, ?, ?)
       RETURNING id`,
      [
        report.feature,
        report.status,
        JSON.stringify(report.summary || {}),
        JSON.stringify(report),
        report.startedAt,
        report.completedAt,
      ]
    );

    return getRun(result.lastID);
  };

  const listRuns = ({ feature, limit = 20 } = {}) => {
    const params = [];
    let query = `
      SELECT id, feature, status, summary, started_at, completed_at, created_at
      FROM ai_evaluation_runs
    `;

    if (feature) {
      params.push(feature);
      query += ' WHERE feature = ?';
    }

    params.push(Math.min(Math.max(Number(limit) || 20, 1), 100));
    query += ' ORDER BY id DESC LIMIT ?';

    return allAsync(query, params);
  };

  const getRun = (id) => getAsync(
    `SELECT id, feature, status, summary, report, started_at, completed_at, created_at
     FROM ai_evaluation_runs
     WHERE id = ?`,
    [id]
  );

  const getLatestRun = (feature) => getAsync(
    `SELECT id, feature, status, summary, report, started_at, completed_at, created_at
     FROM ai_evaluation_runs
     WHERE feature = ?
     ORDER BY id DESC
     LIMIT 1`,
    [feature]
  );

  return {
    getLatestRun,
    getRun,
    listRuns,
    saveRun,
  };
};

module.exports = {
  createEvaluationRepository,
};
