/**
 * Tasks Routes - Refactored Version
 * 
 * Demonstrates improved code organization using utility helpers:
 * - asyncHandler for automatic error handling
 * - Cache helper utilities for DRY cache operations
 * - Audit decorator for simplified audit logging
 * - Response helpers for consistent responses
 * 
 * Compare with tasks.routes.js to see improvements
 * 
 * @module routes/tasks
 */

const express = require('express');

const { TASK_PAGE_CACHE_TTL_SECONDS } = require('../config/env');
const { asyncHandler } = require('../middleware/errorHandler');
const { logCreate, logUpdate, logDelete } = require('../utils/auditDecorator');
const {
  buildUserResourceCacheKey,
  getCachedOrFetch,
  sendCachedJson,
} = require('../utils/cacheHelper');
const {
  sendSuccess,
  sendNotFound,
  sendValidationError,
  sendServerError,
} = require('../utils/responseHelper');
const { createTasksService } = require('../services/tasks.service');
const { createRecurrenceService } = require('../services/recurrence.service');
const { emitToUser } = require('../realtime');
const logger = require('../logger');
const {
  validateCreateTask,
  validateTagName,
  validateUpdateTask,
} = require('../schemas/task.schema');

/**
 * Build cache key for task list
 */
const buildTaskListCacheKey = ({ userId, archived }) => {
  return buildUserResourceCacheKey({
    userId,
    resource: 'tasks',
    filters: { status: archived ? 'archived' : 'active' },
  });
};

/**
 * Build cache key for user tags
 */
const buildTaskTagsCacheKey = (userId) => {
  return buildUserResourceCacheKey({
    userId,
    resource: 'task-tags',
  });
};

/**
 * Create tasks router with dependency injection
 */
const createTasksRouter = ({
  authRequired,
  allAsync,
  auditLogs,
  cache = null,
  getAsync,
  runAsync,
  getUserById,
  sendTaskAlertEmail,
  sendTaskSummaryEmail,
}) => {
  const router = express.Router();
  const tasks = createTasksService({ allAsync, getAsync, runAsync });
  const recurrence = createRecurrenceService({ createTask: tasks.createTask });

  // Apply auth middleware to all routes
  router.use(['/tasks', '/tags'], authRequired);

  // ===== Task Routes =====

  /**
   * GET /tasks
   * List all tasks for the current user
   */
  router.get('/tasks', asyncHandler(async (req, res) => {
    const archived = req.query.archived === 'true' ? 1 : 0;
    const userId = req.session.userId;
    const cacheKey = buildTaskListCacheKey({ userId, archived });

    const { data, cacheStatus } = await getCachedOrFetch({
      cache,
      key: cacheKey,
      fetchFn: async () => {
        const rows = await tasks.listTasks({ userId, archived });
        return { tasks: rows };
      },
      ttl: TASK_PAGE_CACHE_TTL_SECONDS,
    });

    sendCachedJson({
      res,
      payload: data,
      cacheStatus,
      ttl: TASK_PAGE_CACHE_TTL_SECONDS,
      cacheHeader: 'X-Redis-Cache',
    });
  }));

  /**
   * POST /tasks
   * Create a new task
   */
  router.post('/tasks', asyncHandler(async (req, res) => {
    const validation = validateCreateTask(req.body);
    if (validation.error) {
      return sendValidationError(res, validation.error);
    }

    const taskInput = validation.value;
    const userId = req.session.userId;

    // Create task
    const task = await tasks.createTask({ userId, ...taskInput });
    
    // Ensure tag exists
    await tasks.ensureTaskTag(userId, taskInput.tag);

    // Send email notification for high/medium priority tasks
    let emailSent = false;
    if (taskInput.priority !== 'low') {
      try {
        const user = await getUserById(userId);
        emailSent = await sendTaskAlertEmail(task, user, taskInput.language);
      } catch (emailError) {
        logger.error({ err: emailError }, 'Failed to send task alert email');
      }
    }

    // Log audit trail
    await logCreate({
      auditLogs,
      req,
      entityType: 'task',
      entityId: task.id,
      summary: task.title,
      after: task,
    });

    // Emit real-time event
    emitToUser(userId, 'task:created', { task });

    sendSuccess(res, { task, emailSent }, 201);
  }));

  /**
   * PUT /tasks/:id
   * Update an existing task
   */
  router.put('/tasks/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;

    // Fetch existing task
    const task = await tasks.getTaskForUser(id, userId);
    if (!task) {
      return sendNotFound(res, 'Task');
    }

    // Validate update data
    const validation = validateUpdateTask(req.body, task);
    if (validation.error) {
      return sendValidationError(res, validation.error);
    }

    const taskInput = validation.value;

    // Update task
    const updatedTask = await tasks.updateTask({
      id,
      userId,
      existingTask: task,
      ...taskInput,
    });

    // Update tag if changed
    if (taskInput.hasTagUpdate) {
      await tasks.ensureTaskTag(userId, taskInput.tag);
    }

    // Handle recurring task completion
    if (
      taskInput.status === 'done' &&
      task.is_recurring &&
      task.status !== 'done'
    ) {
      try {
        const nextTask = await recurrence.createNextRecurringInstance(updatedTask);
        if (nextTask) {
          await logCreate({
            auditLogs,
            req,
            entityType: 'task',
            entityId: nextTask.id,
            summary: nextTask.title,
            after: nextTask,
          });
          emitToUser(userId, 'task:created', { task: nextTask });
        }
      } catch (recurrenceError) {
        logger.error({ err: recurrenceError }, 'Failed to create next recurring instance');
      }
    }

    // Log audit trail
    await logUpdate({
      auditLogs,
      req,
      entityType: 'task',
      entityId: updatedTask.id,
      summary: updatedTask.title,
      before: task,
      after: updatedTask,
    });

    // Emit real-time event
    emitToUser(userId, 'task:updated', { task: updatedTask });

    sendSuccess(res, { task: updatedTask });
  }));

  /**
   * DELETE /tasks/:id
   * Delete a task
   */
  router.delete('/tasks/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;

    // Fetch existing task
    const task = await tasks.getTaskForUser(id, userId);
    if (!task) {
      return sendNotFound(res, 'Task');
    }

    // Delete task
    await tasks.deleteTask(id, userId);

    // Log audit trail
    await logDelete({
      auditLogs,
      req,
      entityType: 'task',
      entityId: task.id,
      summary: task.title,
      before: task,
    });

    // Emit real-time event
    emitToUser(userId, 'task:deleted', { id: Number(id) });

    sendSuccess(res, { success: true });
  }));

  /**
   * POST /tasks/send-email
   * Send task summary email
   */
  router.post('/tasks/send-email', asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    const rows = await tasks.listAllTasksForEmail(userId);
    const user = await getUserById(userId);
    const emailSent = await sendTaskSummaryEmail(rows, user, req.body.language);

    if (!emailSent) {
      return sendServerError(res, 'Email settings are not configured');
    }

    sendSuccess(res, { success: true, emailSent });
  }));

  /**
   * POST /tasks/:id/send-email
   * Send individual task alert email
   */
  router.post('/tasks/:id/send-email', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;

    const task = await tasks.getTaskForUser(id, userId);
    if (!task) {
      return sendNotFound(res, 'Task');
    }

    const user = await getUserById(userId);
    const emailSent = await sendTaskAlertEmail(task, user, req.body.language);

    if (!emailSent) {
      return sendServerError(res, 'Email settings are not configured');
    }

    sendSuccess(res, { success: true, emailSent });
  }));

  // ===== Tag Routes =====

  /**
   * GET /tags
   * List all tags for the current user
   */
  router.get('/tags', asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const cacheKey = buildTaskTagsCacheKey(userId);

    const { data, cacheStatus } = await getCachedOrFetch({
      cache,
      key: cacheKey,
      fetchFn: async () => {
        const tags = await tasks.listTags(userId);
        return { tags };
      },
      ttl: TASK_PAGE_CACHE_TTL_SECONDS,
    });

    sendCachedJson({
      res,
      payload: data,
      cacheStatus,
      ttl: TASK_PAGE_CACHE_TTL_SECONDS,
      cacheHeader: 'X-Redis-Cache',
    });
  }));

  /**
   * POST /tags
   * Create a new tag
   */
  router.post('/tags', asyncHandler(async (req, res) => {
    const validation = validateTagName(req.body.name);
    if (validation.error) {
      return sendValidationError(res, validation.error);
    }

    const name = validation.value;
    const tag = await tasks.ensureTaskTag(req.session.userId, name);

    sendSuccess(res, { tag }, 201);
  }));

  /**
   * PUT /tags/:id
   * Update a tag (with automatic merging if name conflicts)
   */
  router.put('/tags/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;

    const validation = validateTagName(req.body.name);
    if (validation.error) {
      return sendValidationError(res, validation.error);
    }

    const name = validation.value;

    // Fetch existing tag
    const tag = await tasks.getTagForUser(id, userId);
    if (!tag) {
      return sendNotFound(res, 'Tag');
    }

    // Check for name conflict
    const normalizedName = name.toLowerCase();
    const existing = await tasks.findTagByNormalizedName(userId, normalizedName);

    // If conflict exists and it's not the same tag, merge them
    if (existing && Number(existing.id) !== Number(id)) {
      const mergedTag = await tasks.mergeTagIntoExisting({
        userId,
        oldName: tag.name,
        existingTag: existing,
        tagId: id,
      });
      return sendSuccess(res, { tag: mergedTag });
    }

    // Update tag normally
    const updatedTag = await tasks.updateTag({
      id,
      userId,
      name,
      previousName: tag.name,
    });

    sendSuccess(res, { tag: updatedTag });
  }));

  /**
   * DELETE /tags/:id
   * Delete a tag
   */
  router.delete('/tags/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;

    // Fetch existing tag
    const tag = await tasks.getTagForUser(id, userId);
    if (!tag) {
      return sendNotFound(res, 'Tag');
    }

    // Delete tag
    await tasks.deleteTag({ id, userId, name: tag.name });

    sendSuccess(res, { success: true });
  }));

  return router;
};

module.exports = createTasksRouter;
module.exports.buildTaskListCacheKey = buildTaskListCacheKey;
module.exports.buildTaskTagsCacheKey = buildTaskTagsCacheKey;
