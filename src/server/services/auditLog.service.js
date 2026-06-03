const AUDIT_ENTITY_TYPES = new Set(['task', 'transaction', 'note', 'credit_card', 'expense', 'user']);
const AUDIT_ACTIONS = new Set(['create', 'edit', 'delete', 'login', 'register']);

const createAuditLogService = ({ allAsync, runAsync }) => {
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
  }) => {
    if (!AUDIT_ACTIONS.has(action) || !AUDIT_ENTITY_TYPES.has(entityType)) {
      throw new Error('Invalid audit log event');
    }

    await runAsync(
      `INSERT INTO audit_logs (
        user_id, actor_user_id, impersonator_user_id, action, entity_type,
        entity_id, summary, before_data, after_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb)
      RETURNING id`,
      [
        userId || null,
        actorUserId || userId || null,
        impersonatorUserId || null,
        action,
        entityType,
        entityId ? Number(entityId) : null,
        summary || '',
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
      ]
    );
  };

  const list = ({ limit = 100, entityType = '', action = '', userId = null } = {}) => {
    const normalizedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const clauses = [];
    const params = [];

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

    params.push(normalizedLimit);

    return allAsync(
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
         audit_logs.created_at
       FROM audit_logs
       LEFT JOIN users ON users.id = audit_logs.user_id
       LEFT JOIN users actor ON actor.id = audit_logs.actor_user_id
       LEFT JOIN users impersonator ON impersonator.id = audit_logs.impersonator_user_id
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY audit_logs.created_at DESC, audit_logs.id DESC
       LIMIT ?`,
      params
    );
  };

  return {
    list,
    record,
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
