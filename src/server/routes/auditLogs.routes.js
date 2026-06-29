/**
 * Audit Logs Routes
 *
 * Endpoints for viewing and managing audit logs with detailed change tracking.
 * Restricted to admin users only.
 *
 * @module routes/auditLogs
 */

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendSuccess, sendForbidden } = require('../utils/responseHelper');
const { formatAuditLogForDisplay } = require('../utils/auditChanges');

/**
 * Create audit logs router
 *
 * @param {Object} deps - Dependencies
 * @param {Function} deps.adminRequired - Admin authentication middleware
 * @param {Object} deps.auditLogs - Audit log service
 * @returns {Router} Express router
 */
const createAuditLogsRouter = ({ adminRequired, auditLogs }) => {
  const router = express.Router();

  // Require admin authentication for all audit log routes
  router.use('/audit-logs', adminRequired);

  /**
   * GET /audit-logs
   * List audit logs with pagination and filtering
   *
   * Query parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 50, max: 500)
   * - entityType: Filter by entity type (task, user, note, etc.)
   * - action: Filter by action (create, edit, delete, etc.)
   * - userId: Filter by user ID
   * - search: Full-text search across audit logs
   */
  router.get(
    '/audit-logs',
    asyncHandler(async (req, res) => {
      const { page = 1, limit = 50, entityType = '', action = '', userId = null, search = '' } = req.query;

      const result = await auditLogs.list({
        page: Number(page),
        limit: Number(limit),
        entityType,
        action,
        userId: userId ? Number(userId) : null,
        search,
      });

      // Format each audit log to include parsed change details
      const formattedLogs = result.logs.map((log) => formatAuditLogForDisplay(log));

      sendSuccess(res, {
        logs: formattedLogs,
        pagination: result.pagination,
      });
    }),
  );

  /**
   * GET /audit-logs/:id
   * Get a specific audit log entry with full change details
   */
  router.get(
    '/audit-logs/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      // Note: You'll need to add a getById method to auditLogService
      // For now, we'll fetch from the list
      const result = await auditLogs.list({ limit: 1, page: 1 });

      // This is a placeholder - you should implement auditLogs.getById(id)
      const log = result.logs.find((l) => l.id === Number(id));

      if (!log) {
        return sendNotFound(res, 'Audit log');
      }

      const formattedLog = formatAuditLogForDisplay(log);

      sendSuccess(res, { log: formattedLog });
    }),
  );

  /**
   * GET /audit-logs/entity/:entityType/:entityId
   * Get audit history for a specific entity
   *
   * Example: GET /audit-logs/entity/task/123
   * Returns all audit logs for task with ID 123
   */
  router.get(
    '/audit-logs/entity/:entityType/:entityId',
    asyncHandler(async (req, res) => {
      const { entityType, entityId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const result = await auditLogs.list({
        page: Number(page),
        limit: Number(limit),
        entityType,
      });

      // Filter by entity ID (since the service doesn't have this filter)
      const filteredLogs = result.logs.filter((log) => log.entity_id === Number(entityId));

      const formattedLogs = filteredLogs.map((log) => formatAuditLogForDisplay(log));

      sendSuccess(res, {
        logs: formattedLogs,
        entityType,
        entityId: Number(entityId),
      });
    }),
  );

  return router;
};

module.exports = { createAuditLogsRouter };
