const express = require('express');

const { TASK_PAGE_CACHE_TTL_SECONDS } = require('../config/env');
const logger = require('../logger');
const { createAuditContext } = require('../services/auditLog.service');
const { createTasksService } = require('../services/tasks.service');
const { createEmailImportService } = require('../services/emailImport.service');
const { createRecurrenceService } = require('../services/recurrence.service');
const googleDrive = require('../services/googleDrive.service');
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

const clearTaskCaches = async (cache, userId) => {
  await cache?.deleteByPattern?.(`user:${userId}:tasks:*`);
  await cache?.deleteByPattern?.(buildTaskTagsCacheKey(userId));
  await cache?.deleteByPattern?.(`user:${userId}:sprints:*`);
};

const clearTaskCachesForUsers = async (cache, userIds = []) => {
  const uniqueIds = [...new Set(userIds.map(Number).filter(Number.isInteger))];
  await Promise.all(uniqueIds.map((userId) => clearTaskCaches(cache, userId)));
};

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
  queryAsync,
  runAsync,
  getUserById,
  sendTaskAlertEmail,
  sendTaskSummaryEmail,
}) => {
  const router = express.Router();
  const tasks = createTasksService({ allAsync, getAsync, runAsync });
  const emailImport = createEmailImportService();
  const recurrence = createRecurrenceService({
    allAsync,
    auditLogs,
    getAsync,
    getUserById,
    queryAsync,
    runAsync,
    sendTaskAlertEmail,
  });

  const buildActorContext = (req) => ({
    actorUserId: req.session.impersonatorUserId || req.session.userId,
    impersonatorUserId: req.session.impersonatorUserId || null,
  });

  const ensureSprintAccess = async ({ sprintId, userId }) => {
    if (!sprintId) return { sprint: null };
    const sprint = await tasks.getAccessibleSprintForUser(sprintId, userId);
    if (!sprint) {
      return { error: 'Sprint not found' };
    }
    return { sprint };
  };

  const emitTaskEventToUsers = (userIds, eventName, payload) => {
    [...new Set(userIds.map(Number).filter(Number.isInteger))]
      .forEach((userId) => emitToUser(userId, eventName, payload));
  };

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

  // Purge old trash (called on login or by admin; removes tasks deleted > 30 days ago)
  router.post('/tasks/trash/purge', async (req, res) => {
    try {
      await tasks.purgeOldDeletedTasks();
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to purge old trash');
      res.status(500).json({ error: 'Failed to purge old trash' });
    }
  });

  // List deleted tasks (trash)
  router.get('/tasks/trash', async (req, res) => {
    try {
      const deletedTasks = await tasks.listDeletedTasks(req.session.userId);
      res.json({ tasks: deletedTasks });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load trash');
      res.status(500).json({ error: 'Failed to load trash' });
    }
  });

  router.get('/tasks/:id', async (req, res) => {
    try {
      const task = await tasks.getTaskForUser(req.params.id, req.session.userId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json({ task });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load task');
      res.status(500).json({ error: 'Failed to load task' });
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
      await clearTaskCaches(cache, req.session.userId);
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
        await clearTaskCaches(cache, req.session.userId);
        return res.json({ tag: mergedTag });
      }

      const updatedTag = await tasks.updateTag({
        id,
        userId: req.session.userId,
        name,
        previousName: tag.name,
      });
      await clearTaskCaches(cache, req.session.userId);
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
      await clearTaskCaches(cache, req.session.userId);
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

  // Import a saved email (.eml) and immediately create a task from it. The
  // file arrives base64-encoded in JSON, so a route-scoped parser allows a
  // larger payload than the global limit. The parsed draft reuses the same
  // validation and creation path as a normal task POST, so audit logging,
  // tag handling, cache invalidation, and realtime events all stay consistent.
  router.post('/tasks/import-email', express.json({ limit: '20mb' }), async (req, res) => {
    const base64Eml = String(req.body?.eml || '');
    if (!base64Eml) {
      return res.status(400).json({ error: 'No email file provided.' });
    }

    try {
      const parsed = emailImport.parseEmailToTask({ base64Eml });
      if (parsed.error) {
        return res.status(422).json({ error: parsed.error });
      }

      const validation = validateCreateTask(parsed.task);
      if (validation.error) {
        return res.status(400).json({ error: validation.error });
      }
      const taskInput = validation.value;

      const sprintAccess = await ensureSprintAccess({
        sprintId: taskInput.sprintId,
        userId: req.session.userId,
      });
      if (sprintAccess.error) {
        return res.status(404).json({ error: sprintAccess.error });
      }

      const task = await tasks.createTask({
        userId: req.session.userId,
        ...taskInput,
      });
      await tasks.ensureTaskTag(req.session.userId, taskInput.tag);
      const accessUserIds = await tasks.listTaskAccessUserIds(task.id);
      await clearTaskCachesForUsers(cache, accessUserIds);

      await auditLogs.record({
        ...createAuditContext(req),
        action: 'create',
        entityType: 'task',
        entityId: task.id,
        summary: task.title,
        after: task,
      });

      emitTaskEventToUsers(accessUserIds, 'task:created', { task });
      res.json({ task });
    } catch (error) {
      logger.error({ err: error }, 'Failed to import email');
      res.status(500).json({ error: 'Failed to import email' });
    }
  });

  router.post('/tasks', async (req, res) => {
    const validation = validateCreateTask(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }
    const taskInput = validation.value;

    try {
      const sprintAccess = await ensureSprintAccess({
        sprintId: taskInput.sprintId,
        userId: req.session.userId,
      });
      if (sprintAccess.error) {
        return res.status(404).json({ error: sprintAccess.error });
      }

      // Upload attachment to Google Drive if enabled
      if (taskInput.attachment?.data && googleDrive.isEnabled()) {
        const driveResult = await googleDrive.uploadFile({
          fileName: taskInput.attachment.name,
          mimeType: taskInput.attachment.type || 'application/octet-stream',
          data: taskInput.attachment.data,
        });
        if (driveResult) {
          taskInput.attachment.data = null;
          taskInput.attachmentDriveId = driveResult.fileId;
          taskInput.attachmentUrl = driveResult.webViewLink;
        }
      }

      const task = await tasks.createTask({
        userId: req.session.userId,
        ...taskInput,
      });
      await tasks.ensureTaskTag(req.session.userId, taskInput.tag);
      const accessUserIds = await tasks.listTaskAccessUserIds(task.id);
      await clearTaskCachesForUsers(cache, accessUserIds);
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
      if (taskInput.isRecurring) {
        const ruleResult = await recurrence.createRuleForTask({
          task,
          input: {
            frequency: taskInput.recurrencePattern,
            interval: taskInput.recurrenceInterval,
            weekdays: taskInput.recurrenceDays,
            timezone: taskInput.recurrenceTimezone,
            endDate: taskInput.recurrenceEndDate,
            occurrenceLimit: taskInput.recurrenceOccurrenceLimit,
            startDate: taskInput.dueDate,
          },
          actor: buildActorContext(req),
        });
        if (ruleResult.error) {
          return res.status(400).json({ error: ruleResult.error });
        }
      }
      emitTaskEventToUsers(accessUserIds, 'task:created', { task });
      res.json({ task, emailSent });
    } catch (error) {
      logger.error({ err: error }, 'Failed to create task');
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  router.put('/tasks/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const task = await tasks.getTaskForUser(id, req.session.userId, { includeActivityHistory: false });
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const validation = validateUpdateTask(req.body, task);
      if (validation.error) {
        return res.status(400).json({ error: validation.error });
      }
      const taskInput = validation.value;

      if (
        taskInput.hasSprintUpdate
        && taskInput.sprintId === null
        && Number(task.user_id) !== Number(req.session.userId)
        && Number(task.sprint_owner_user_id) !== Number(req.session.userId)
      ) {
        return res.status(403).json({ error: 'Only the task or sprint owner can remove this task from a shared sprint' });
      }

      if (taskInput.hasSprintUpdate && taskInput.sprintId) {
        const sprintAccess = await ensureSprintAccess({
          sprintId: taskInput.sprintId,
          userId: req.session.userId,
        });
        if (sprintAccess.error) {
          return res.status(404).json({ error: sprintAccess.error });
        }
      }

      const previousAccessUserIds = await tasks.listTaskAccessUserIds(id);

      // Upload attachment to Google Drive if enabled (on update)
      if (taskInput.hasAttachmentUpdate && taskInput.attachment?.data && googleDrive.isEnabled()) {
        const driveResult = await googleDrive.uploadFile({
          fileName: taskInput.attachment.name,
          mimeType: taskInput.attachment.type || 'application/octet-stream',
          data: taskInput.attachment.data,
        });
        if (driveResult) {
          taskInput.attachment.data = null;
          taskInput.attachmentDriveId = driveResult.fileId;
          taskInput.attachmentUrl = driveResult.webViewLink;
          // Delete old Drive file if replacing
          if (task.attachment_drive_id) {
            googleDrive.deleteFile(task.attachment_drive_id).catch(() => {});
          }
        }
      }

      const updatedTask = await tasks.updateTask({
        id,
        userId: req.session.userId,
        existingTask: task,
        ...taskInput,
      });
      if (taskInput.hasTagUpdate) {
        await tasks.ensureTaskTag(task.user_id, taskInput.tag);
      }
      const currentAccessUserIds = await tasks.listTaskAccessUserIds(id);
      await clearTaskCachesForUsers(cache, [...previousAccessUserIds, ...currentAccessUserIds]);

      if (taskInput.isRecurring !== undefined) {
        if (taskInput.isRecurring) {
          const ruleResult = await recurrence.updateRuleForTask({
            task: updatedTask,
            input: {
              frequency: taskInput.recurrencePattern,
              interval: taskInput.recurrenceInterval,
              weekdays: taskInput.recurrenceDays,
              timezone: taskInput.recurrenceTimezone,
              endDate: taskInput.recurrenceEndDate,
              occurrenceLimit: taskInput.recurrenceOccurrenceLimit,
              startDate: updatedTask.due_date,
            },
            actor: buildActorContext(req),
            scope: taskInput.recurrenceScope,
          });
          if (ruleResult.error) {
            return res.status(400).json({ error: ruleResult.error });
          }
        } else if (task.recurring_rule_id) {
          const ruleResult = await recurrence.setRuleStatusForTask({
            task,
            status: 'deleted',
            actor: buildActorContext(req),
          });
          if (ruleResult.error) {
            return res.status(400).json({ error: ruleResult.error });
          }
        }
      }

      await auditLogs.record({
        ...createAuditContext(req),
        userId: updatedTask.user_id,
        action: 'edit',
        entityType: 'task',
        entityId: updatedTask.id,
        summary: updatedTask.title,
        before: task,
        after: updatedTask,
      });
      const taskWithHistory = await tasks.getTaskForUser(id, req.session.userId, { includeActivityHistory: false }) || updatedTask;
      emitTaskEventToUsers([...previousAccessUserIds, ...currentAccessUserIds], 'task:updated', { task: taskWithHistory });
      res.json({ task: taskWithHistory });
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
      if (Number(task.user_id) !== Number(req.session.userId)) {
        return res.status(403).json({ error: 'Only the task owner can delete this task' });
      }

      const accessUserIds = await tasks.listTaskAccessUserIds(id);
      await tasks.deleteTask(id, task.user_id);
      await clearTaskCachesForUsers(cache, accessUserIds);
      await auditLogs.record({
        ...createAuditContext(req),
        userId: task.user_id,
        action: 'delete',
        entityType: 'task',
        entityId: task.id,
        summary: task.title,
        before: task,
      });
      emitTaskEventToUsers(accessUserIds, 'task:deleted', { id: Number(id) });
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete task');
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  // --- Trash (soft-delete) endpoints ---

  // Restore a task from trash
  router.post('/tasks/:id/restore', async (req, res) => {
    const { id } = req.params;
    try {
      await tasks.restoreTask(id, req.session.userId);
      const task = await tasks.getTaskForUser(id, req.session.userId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found in trash' });
      }
      await clearTaskCachesForUsers(cache, [req.session.userId]);
      emitTaskEventToUsers([req.session.userId], 'task:restored', { task });
      res.json({ task });
    } catch (error) {
      logger.error({ err: error }, 'Failed to restore task');
      res.status(500).json({ error: 'Failed to restore task' });
    }
  });

  // Permanently delete a task from trash
  router.delete('/tasks/:id/permanent', async (req, res) => {
    const { id } = req.params;
    try {
      await tasks.permanentlyDeleteTask(id, req.session.userId);
      await clearTaskCachesForUsers(cache, [req.session.userId]);
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to permanently delete task');
      res.status(500).json({ error: 'Failed to permanently delete task' });
    }
  });

  router.post('/tasks/:id/recurrence/:action', async (req, res) => {
    const { id, action } = req.params;
    const statusByAction = {
      pause: 'paused',
      resume: 'active',
      delete: 'deleted',
    };
    const status = statusByAction[action];
    if (!status) {
      return res.status(400).json({ error: 'Unsupported recurrence action' });
    }

    try {
      const task = await tasks.getTaskForUser(id, req.session.userId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const accessUserIds = await tasks.listTaskAccessUserIds(id);
      const result = await recurrence.setRuleStatusForTask({
        task,
        status,
        actor: buildActorContext(req),
      });
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      await clearTaskCachesForUsers(cache, accessUserIds);
      emitTaskEventToUsers(accessUserIds, 'task:recurrence-updated', { taskId: Number(id), rule: result.rule });
      res.json({ rule: result.rule });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update recurrence status');
      res.status(500).json({ error: 'Failed to update recurrence status' });
    }
  });

  return router;
};

module.exports = createTasksRouter;
module.exports.buildTaskListCacheKey = buildTaskListCacheKey;
module.exports.buildTaskTagsCacheKey = buildTaskTagsCacheKey;
