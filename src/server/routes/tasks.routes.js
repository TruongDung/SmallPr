const express = require('express');

const { TASK_PAGE_CACHE_TTL_SECONDS } = require('../config/env');
const logger = require('../logger');
const { createAuditContext } = require('../services/auditLog.service');
const { createTasksService } = require('../services/tasks.service');
const { createRecurrenceService } = require('../services/recurrence.service');
const { emitToUser } = require('../realtime');
const {
  validateCreateTask,
  validateTagName,
  validateUpdateTask,
} = require('../schemas/task.schema');

const buildTaskListCacheKey = ({ userId, archived }) => [
  'user',
  userId,
  'tasks',
  'v1',
  archived ? 'archived' : 'active',
].join(':');

const buildTaskTagsCacheKey = (userId) => `user:${userId}:task-tags:v1`;

const sendCachedJson = ({ res, payload, cacheStatus }) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Redis-Cache', cacheStatus);
  res.set('X-Task-Cache-TTL', String(TASK_PAGE_CACHE_TTL_SECONDS));
  res.json(payload);
};

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

  router.use(['/tasks', '/tags'], authRequired);

  router.get('/tasks', async (req, res) => {
    try {
      const archived = req.query.archived === 'true' ? 1 : 0;
      const cacheKey = buildTaskListCacheKey({ userId: req.session.userId, archived });
      const cached = await cache?.getJson?.(cacheKey);
      if (cached) {
        return sendCachedJson({ res, payload: cached, cacheStatus: 'HIT' });
      }

      const rows = await tasks.listTasks({ userId: req.session.userId, archived });
      const payload = { tasks: rows };
      const wroteCache = await cache?.setJson?.(cacheKey, payload, TASK_PAGE_CACHE_TTL_SECONDS);
      sendCachedJson({ res, payload, cacheStatus: wroteCache ? 'MISS' : 'BYPASS' });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load tasks');
      res.status(500).json({ error: 'Failed to load tasks' });
    }
  });

  router.get('/tags', async (req, res) => {
    try {
      const cacheKey = buildTaskTagsCacheKey(req.session.userId);
      const cached = await cache?.getJson?.(cacheKey);
      if (cached) {
        return sendCachedJson({ res, payload: cached, cacheStatus: 'HIT' });
      }

      const tags = await tasks.listTags(req.session.userId);
      const payload = { tags };
      const wroteCache = await cache?.setJson?.(cacheKey, payload, TASK_PAGE_CACHE_TTL_SECONDS);
      sendCachedJson({ res, payload, cacheStatus: wroteCache ? 'MISS' : 'BYPASS' });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load tags');
      res.status(500).json({ error: 'Failed to load tags' });
    }
  });

  router.post('/tags', async (req, res) => {
    const validation = validateTagName(req.body.name);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }
    const name = validation.value;

    try {
      const tag = await tasks.ensureTaskTag(req.session.userId, name);
      res.json({ tag });
    } catch (error) {
      logger.error({ err: error }, 'Failed to save tag');
      res.status(500).json({ error: 'Failed to save tag' });
    }
  });

  router.put('/tags/:id', async (req, res) => {
    const { id } = req.params;
    const validation = validateTagName(req.body.name);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }
    const name = validation.value;

    try {
      const tag = await tasks.getTagForUser(id, req.session.userId);
      if (!tag) {
        return res.status(404).json({ error: 'Tag not found' });
      }

      const normalizedName = name.toLowerCase();
      const existing = await tasks.findTagByNormalizedName(req.session.userId, normalizedName);

      if (existing && Number(existing.id) !== Number(id)) {
        const mergedTag = await tasks.mergeTagIntoExisting({
          userId: req.session.userId,
          oldName: tag.name,
          existingTag: existing,
          tagId: id,
        });
        return res.json({ tag: mergedTag });
      }

      const updatedTag = await tasks.updateTag({
        id,
        userId: req.session.userId,
        name,
        previousName: tag.name,
      });
      res.json({ tag: updatedTag });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update tag');
      res.status(500).json({ error: 'Failed to update tag' });
    }
  });

  router.delete('/tags/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const tag = await tasks.getTagForUser(id, req.session.userId);
      if (!tag) {
        return res.status(404).json({ error: 'Tag not found' });
      }

      await tasks.deleteTag({ id, userId: req.session.userId, name: tag.name });
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete tag');
      res.status(500).json({ error: 'Failed to delete tag' });
    }
  });

  router.post('/tasks/send-email', async (req, res) => {
    try {
      const rows = await tasks.listAllTasksForEmail(req.session.userId);
      const user = await getUserById(req.session.userId);
      const emailSent = await sendTaskSummaryEmail(rows, user, req.body.language);

      if (!emailSent) {
        return res.status(500).json({ error: 'Email settings are not configured' });
      }

      res.json({ success: true, emailSent });
    } catch (error) {
      logger.error({ err: error }, 'Failed to send task summary email');
      res.status(500).json({
        error: 'Failed to send email',
        detail: error.code || error.message || 'unknown',
      });
    }
  });

  router.post('/tasks/:id/send-email', async (req, res) => {
    const { id } = req.params;

    try {
      const task = await tasks.getTaskForUser(id, req.session.userId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const user = await getUserById(req.session.userId);
      const emailSent = await sendTaskAlertEmail(task, user, req.body.language);

      if (!emailSent) {
        return res.status(500).json({ error: 'Email settings are not configured' });
      }

      res.json({ success: true, emailSent });
    } catch (error) {
      logger.error({ err: error }, 'Failed to send task email');
      res.status(500).json({
        error: 'Failed to send email',
        detail: error.code || error.message || 'unknown',
      });
    }
  });

  router.post('/tasks', async (req, res) => {
    const validation = validateCreateTask(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }
    const taskInput = validation.value;

    try {
      const task = await tasks.createTask({
        userId: req.session.userId,
        ...taskInput,
      });
      await tasks.ensureTaskTag(req.session.userId, taskInput.tag);
      const user = await getUserById(req.session.userId);
      let emailSent = false;

      if (taskInput.priority !== 'low') {
        try {
          emailSent = await sendTaskAlertEmail(task, user, taskInput.language);
        } catch (emailError) {
          logger.error({ err: emailError }, 'Failed to send task alert email');
        }
      }

      await auditLogs.record({
        ...createAuditContext(req),
        action: 'create',
        entityType: 'task',
        entityId: task.id,
        summary: task.title,
        after: task,
      });
      emitToUser(req.session.userId, 'task:created', { task });
      res.json({ task, emailSent });
    } catch (error) {
      logger.error({ err: error }, 'Failed to create task');
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  router.put('/tasks/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const task = await tasks.getTaskForUser(id, req.session.userId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const validation = validateUpdateTask(req.body, task);
      if (validation.error) {
        return res.status(400).json({ error: validation.error });
      }
      const taskInput = validation.value;

      const updatedTask = await tasks.updateTask({
        id,
        userId: req.session.userId,
        existingTask: task,
        ...taskInput,
      });
      if (taskInput.hasTagUpdate) {
        await tasks.ensureTaskTag(req.session.userId, taskInput.tag);
      }

      // If task was marked as done and is recurring, create next instance
      if (taskInput.status === 'done' && task.is_recurring && task.status !== 'done') {
        try {
          const nextTask = await recurrence.createNextRecurringInstance(updatedTask);
          if (nextTask) {
            await auditLogs.record({
              ...createAuditContext(req),
              action: 'create',
              entityType: 'task',
              entityId: nextTask.id,
              summary: nextTask.title,
              after: nextTask,
            });
            emitToUser(req.session.userId, 'task:created', { task: nextTask });
          }
        } catch (recurrenceError) {
          logger.error({ err: recurrenceError }, 'Failed to create next recurring instance');
        }
      }

      await auditLogs.record({
        ...createAuditContext(req),
        action: 'edit',
        entityType: 'task',
        entityId: updatedTask.id,
        summary: updatedTask.title,
        before: task,
        after: updatedTask,
      });
      emitToUser(req.session.userId, 'task:updated', { task: updatedTask });
      res.json({ task: updatedTask });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update task');
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  router.delete('/tasks/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const task = await tasks.getTaskForUser(id, req.session.userId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      await tasks.deleteTask(id, req.session.userId);
      await auditLogs.record({
        ...createAuditContext(req),
        action: 'delete',
        entityType: 'task',
        entityId: task.id,
        summary: task.title,
        before: task,
      });
      emitToUser(req.session.userId, 'task:deleted', { id: Number(id) });
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete task');
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  return router;
};

module.exports = createTasksRouter;
module.exports.buildTaskListCacheKey = buildTaskListCacheKey;
module.exports.buildTaskTagsCacheKey = buildTaskTagsCacheKey;
