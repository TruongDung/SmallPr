/**
 * Audit Logging Decorator
 *
 * Provides reusable functions to automatically log CRUD operations
 * to the audit log with detailed change tracking, reducing boilerplate
 * code in route handlers.
 *
 * @module utils/auditDecorator
 */

const { enhanceAuditEntry } = require('./auditChanges');

/**
 * Create audit context from Express request
 *
 * @param {Request} req - Express request object
 * @returns {Object} Audit context with session info
 */
const createAuditContext = (req) => {
  return {
    userId: req.session?.userId || null,
    actorUserId: req.session?.userId || null,
    sessionId: req.sessionID || null,
    ip: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
  };
};

/**
 * Log create operation
 *
 * @param {Object} params
 * @param {Object} params.auditLogs - Audit log service
 * @param {Request} params.req - Express request
 * @param {string} params.entityType - Type of entity (e.g., 'task', 'note')
 * @param {number|string} params.entityId - Entity ID
 * @param {string} params.summary - Brief description
 * @param {Object} params.after - Created entity data
 * @returns {Promise<void>}
 */
const logCreate = async ({ auditLogs, req, entityType, entityId, summary, after }) => {
  await auditLogs.record({
    ...createAuditContext(req),
    action: 'create',
    entityType,
    entityId,
    summary,
    after,
  });
};

/**
 * Log update operation with automatic change detection
 *
 * @param {Object} params
 * @param {Object} params.auditLogs - Audit log service
 * @param {Request} params.req - Express request
 * @param {string} params.entityType - Type of entity
 * @param {number|string} params.entityId - Entity ID
 * @param {string} params.summary - Brief description
 * @param {Object} params.before - Entity data before update
 * @param {Object} params.after - Entity data after update
 * @returns {Promise<void>}
 */
const logUpdate = async ({ auditLogs, req, entityType, entityId, summary, before, after }) => {
  // Enhance the audit entry with change details
  const enhancedEntry = enhanceAuditEntry({
    ...createAuditContext(req),
    action: 'edit',
    entityType,
    entityId,
    summary,
    before,
    after,
  });

  await auditLogs.record(enhancedEntry);
};

/**
 * Log delete operation
 *
 * @param {Object} params
 * @param {Object} params.auditLogs - Audit log service
 * @param {Request} params.req - Express request
 * @param {string} params.entityType - Type of entity
 * @param {number|string} params.entityId - Entity ID
 * @param {string} params.summary - Brief description
 * @param {Object} params.before - Entity data before deletion
 * @returns {Promise<void>}
 */
const logDelete = async ({ auditLogs, req, entityType, entityId, summary, before }) => {
  await auditLogs.record({
    ...createAuditContext(req),
    action: 'delete',
    entityType,
    entityId,
    summary,
    before,
  });
};

/**
 * Log custom action
 *
 * @param {Object} params
 * @param {Object} params.auditLogs - Audit log service
 * @param {Request} params.req - Express request
 * @param {string} params.action - Custom action name
 * @param {string} params.entityType - Type of entity
 * @param {number|string} params.entityId - Entity ID
 * @param {string} params.summary - Brief description
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<void>}
 */
const logAction = async ({ auditLogs, req, action, entityType, entityId, summary, metadata = {} }) => {
  await auditLogs.record({
    ...createAuditContext(req),
    action,
    entityType,
    entityId,
    summary,
    ...metadata,
  });
};

/**
 * Higher-order function to wrap route handlers with automatic audit logging
 *
 * @param {Object} config
 * @param {Object} config.auditLogs - Audit log service
 * @param {string} config.action - Action type ('create', 'edit', 'delete')
 * @param {string} config.entityType - Entity type
 * @param {Function} config.getEntityId - Function to extract entity ID from result
 * @param {Function} config.getSummary - Function to generate summary from result
 * @param {Function} config.getBefore - Function to get 'before' state (for updates/deletes)
 * @returns {Function} Middleware wrapper
 *
 * @example
 * const createTaskHandler = withAudit({
 *   auditLogs,
 *   action: 'create',
 *   entityType: 'task',
 *   getEntityId: (result) => result.task.id,
 *   getSummary: (result) => result.task.title,
 * })(async (req, res) => {
 *   const task = await tasksService.createTask(req.body);
 *   res.json({ task });
 *   return { task }; // Return value used for audit logging
 * });
 */
const withAudit = ({ auditLogs, action, entityType, getEntityId, getSummary, getBefore }) => {
  return (handler) => {
    return async (req, res, next) => {
      try {
        // Execute the original handler
        const result = await handler(req, res, next);

        // Skip audit if response already sent or no result
        if (res.headersSent || !result) {
          return;
        }

        // Build audit log entry
        const entityId = getEntityId(result);
        const summary = getSummary(result);

        const auditEntry = {
          ...createAuditContext(req),
          action,
          entityType,
          entityId,
          summary,
        };

        // Add before/after data based on action type
        if (action === 'create') {
          auditEntry.after = result;
        } else if (action === 'edit') {
          auditEntry.before = getBefore ? getBefore(result) : null;
          auditEntry.after = result;
        } else if (action === 'delete') {
          auditEntry.before = getBefore ? getBefore(result) : result;
        }

        // Record audit log (non-blocking)
        auditLogs.record(auditEntry).catch((err) => {
          console.error('Failed to record audit log:', err);
        });
      } catch (error) {
        next(error);
      }
    };
  };
};

module.exports = {
  createAuditContext,
  logCreate,
  logUpdate,
  logDelete,
  logAction,
  withAudit,
};
