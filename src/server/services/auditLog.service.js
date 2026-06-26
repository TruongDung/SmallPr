const AUDIT_ENTITY_TYPES = new Set(['task', 'transaction', 'note', 'note_folder', 'credit_card', 'expense', 'user', 'recurrence']);
const AUDIT_LOGS_ENABLED_KEY = 'audit_logs_enabled';
const AUDIT_ACTIONS = new Set([
  'create',
  'edit',
  'delete',
  'login',
  'register',
  'recurrence_created',
  'recurrence_updated',
  'recurrence_paused',
  'recurrence_resumed',
  'recurrence_deleted',
  'task_auto_generated',
]);

const normalizeAuditLogsEnabled = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() !== 'false';
  return value !== false;
};

const createAuditLogService = ({ allAsync, runAsync }) => {
  // Audit snapshots should capture the entity's own fields, not large derived
  // or binary data. Stripping these keeps the audit_logs table from ballooning
  // (e.g. a task snapshot embedding its full activity_history would compound on
  // every edit) and keeps detail views fast.
  const HEAVY_SNAPSHOT_KEYS = ['activity_history', 'attachment_data', 'related_tasks'];
  const stripHeavySnapshot = (data) => {
    if (!data || typeof data !== 'object') return data;
    const clone = { ...data };
    HEAVY_SNAPSHOT_KEYS.forEach((key) => { delete clone[key]; });
    return clone;
  };

  const isEnabled = async () => {
    const rows = await allAsync(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?',
      [AUDIT_LOGS_ENABLED_KEY]
    );
    return normalizeAuditLogsEnabled(rows[0]?.setting_value ?? true);
  };

  const getSettings = async () => ({
    enabled: await isEnabled(),
  });

  const setEnabled = async (enabled) => {
    const normalized = Boolean(enabled);
    await runAsync(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at)
       VALUES (?, ?::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value,
                     updated_at = CURRENT_TIMESTAMP`,
      [AUDIT_LOGS_ENABLED_KEY, JSON.stringify(normalized)]
    );
    return { enabled: normalized };
  };

  const record = async ({
    userId,
    actorUserId,
    impersonatorUserId = null,
    action,
    entityType,
    entityId,
    summary = '',
    before = null,
    after = null,
    ipAddress = null,
  }) => {
    if (!AUDIT_ACTIONS.has(action) || !AUDIT_ENTITY_TYPES.has(entityType)) {
      throw new Error('Invalid audit log event');
    }

    if (!(await isEnabled())) return null;

    const beforeSnapshot = stripHeavySnapshot(before);
    const afterSnapshot = stripHeavySnapshot(after);

    await runAsync(
      `INSERT INTO audit_logs (
        user_id, actor_user_id, impersonator_user_id, action, entity_type,
        entity_id, summary, before_data, after_data, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?)
      RETURNING id`,
      [
        userId || null,
        actorUserId || userId || null,
        impersonatorUserId || null,
        action,
        entityType,
        entityId ? Number(entityId) : null,
        summary || '',
        beforeSnapshot ? JSON.stringify(beforeSnapshot) : null,
        afterSnapshot ? JSON.stringify(afterSnapshot) : null,
        ipAddress || null,
      ]
    );
  };

  const list = async ({ limit = 100, page = 1, entityType = '', action = '', userId = null, search = '' } = {}) => {
    const normalizedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const requestedPage = Math.max(Number(page) || 1, 1);
    const normalizedSearch = String(search || '').trim().slice(0, 200);
    const clauses = [];
    const params = [];
    const fromClause = `FROM audit_logs
       LEFT JOIN users ON users.id = audit_logs.user_id
       LEFT JOIN users actor ON actor.id = audit_logs.actor_user_id
       LEFT JOIN users impersonator ON impersonator.id = audit_logs.impersonator_user_id`;

    if (AUDIT_ENTITY_TYPES.has(entityType)) {
      clauses.push('audit_logs.entity_type = ?');
      params.push(entityType);
    }

    if (AUDIT_ACTIONS.has(action)) {
      clauses.push('audit_logs.action = ?');
      params.push(action);
    }

    if (userId) {
      clauses.push('audit_logs.user_id = ?');
      params.push(userId);
    }

    if (normalizedSearch) {
      clauses.push(`to_tsvector('simple',
        COALESCE(users.username, '') || ' ' ||
        COALESCE(users.name, '') || ' ' ||
        COALESCE(actor.username, '') || ' ' ||
        COALESCE(actor.name, '') || ' ' ||
        COALESCE(impersonator.username, '') || ' ' ||
        COALESCE(audit_logs.action, '') || ' ' ||
        COALESCE(audit_logs.entity_type, '') || ' ' ||
        COALESCE(audit_logs.entity_id::text, '') || ' ' ||
        COALESCE(audit_logs.summary, '') || ' ' ||
        COALESCE(audit_logs.before_data::text, '') || ' ' ||
        COALESCE(audit_logs.after_data::text, '')
      ) @@ plainto_tsquery('simple', ?)`);
      params.push(normalizedSearch);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const totalRows = await allAsync(
      `SELECT COUNT(*)::int AS total
       ${fromClause}
       ${whereClause}`,
      params
    );
    const total = Number(totalRows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / normalizedLimit));
    const currentPage = total ? Math.min(requestedPage, totalPages) : 1;
    const offset = (currentPage - 1) * normalizedLimit;

    params.push(normalizedLimit, offset);

    const logs = await allAsync(
      `SELECT
         audit_logs.id,
         audit_logs.user_id,
         users.username AS username,
         users.name AS name,
         audit_logs.actor_user_id,
         actor.username AS actor_username,
         actor.name AS actor_name,
         audit_logs.impersonator_user_id,
         impersonator.username AS impersonator_username,
         audit_logs.action,
         audit_logs.entity_type,
         audit_logs.entity_id,
         audit_logs.summary,
         audit_logs.before_data,
         audit_logs.after_data,
         audit_logs.ip_address,
         audit_logs.created_at
       ${fromClause}
       ${whereClause}
       ORDER BY audit_logs.created_at DESC, audit_logs.id DESC
       LIMIT ? OFFSET ?`,
      params
    );

    return {
      logs,
      pagination: {
        page: currentPage,
        limit: normalizedLimit,
        total,
        totalPages,
        hasPreviousPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
      },
    };
  };

  return {
    getSettings,
    list,
    record,
    setEnabled,
  };
};

const createAuditContext = (req) => ({
  userId: req.session.userId,
  actorUserId: req.session.impersonatorUserId || req.session.userId,
  impersonatorUserId: req.session.impersonatorUserId || null,
});

module.exports = {
  createAuditContext,
  createAuditLogService,
};
