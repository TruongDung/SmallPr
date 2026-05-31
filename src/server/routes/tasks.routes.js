const express = require('express');

const {
  MAX_TAG_LENGTH,
  MAX_TASK_TEXT_LENGTH,
} = require('../constants/tasks');
const { createTasksService } = require('../services/tasks.service');
const { createRecurrenceService } = require('../services/recurrence.service');
const { emitToUser } = require('../realtime');
const {
  normalizePriority,
  normalizeStatus,
  normalizeTag,
  parseAttachment,
  stripHtml,
} = require('../utils/tasks');

const createTasksRouter = ({
  authRequired,
  allAsync,
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
      const rows = await tasks.listTasks({ userId: req.session.userId, archived });
      res.json({ tasks: rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to load tasks' });
    }
  });

  router.get('/tags', async (req, res) => {
    try {
      const tags = await tasks.listTags(req.session.userId);
      res.json({ tags });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to load tags' });
    }
  });

  router.post('/tags', async (req, res) => {
    const name = normalizeTag(req.body.name);
    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }
    if (name.length > MAX_TAG_LENGTH) {
      return res.status(400).json({ error: `Tag name must be ${MAX_TAG_LENGTH} characters or less` });
    }

    try {
      const tag = await tasks.ensureTaskTag(req.session.userId, name);
      res.json({ tag });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to save tag' });
    }
  });

  router.put('/tags/:id', async (req, res) => {
    const { id } = req.params;
    const name = normalizeTag(req.body.name);
    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }
    if (name.length > MAX_TAG_LENGTH) {
      return res.status(400).json({ error: `Tag name must be ${MAX_TAG_LENGTH} characters or less` });
    }

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
      console.error(error);
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
      console.error(error);
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
      console.error('Failed to send task summary email:', {
        code: error.code,
        command: error.command,
        response: error.response,
        message: error.message,
      });
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
      console.error('Failed to send task email:', {
        code: error.code,
        command: error.command,
        response: error.response,
        message: error.message,
      });
      res.status(500).json({
        error: 'Failed to send email',
        detail: error.code || error.message || 'unknown',
      });
    }
  });

  router.post('/tasks', async (req, res) => {
    const {
      title, tag, description, comment, priority, status, time_spent_minutes, reminder_at, attachment, language,
      is_recurring, recurrence_pattern, recurrence_interval, recurrence_days
    } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const normalizedTag = normalizeTag(tag);
    if (normalizedTag.length > MAX_TAG_LENGTH) {
      return res.status(400).json({ error: `Task tag must be ${MAX_TAG_LENGTH} characters or less` });
    }

    const normalizedPriority = normalizePriority(priority);
    if (!normalizedPriority) {
      return res.status(400).json({ error: 'Task priority must be low, medium, or high' });
    }

    const normalizedStatus = normalizeStatus(status);
    if (!normalizedStatus) {
      return res.status(400).json({ error: 'Task status must be todo, in_progress, or done' });
    }

    if (title.length > 20) {
      return res.status(400).json({ error: 'Task title must be 20 characters or less' });
    }

    if (description && stripHtml(description).length > MAX_TASK_TEXT_LENGTH) {
      return res.status(400).json({ error: `Task description must be ${MAX_TASK_TEXT_LENGTH} characters or less` });
    }

    if (comment && String(comment).length > MAX_TASK_TEXT_LENGTH) {
      return res.status(400).json({ error: `Task comment must be ${MAX_TASK_TEXT_LENGTH} characters or less` });
    }

    let parsedAttachment = null;
    try {
      parsedAttachment = parseAttachment(attachment);
    } catch (attachmentError) {
      return res.status(400).json({ error: attachmentError.message });
    }

    try {
      const task = await tasks.createTask({
        userId: req.session.userId,
        title,
        tag: normalizedTag,
        description,
        comment,
        priority: normalizedPriority,
        status: normalizedStatus,
        timeSpentMinutes: time_spent_minutes,
        reminderAt: reminder_at,
        attachment: parsedAttachment,
        isRecurring: is_recurring || false,
        recurrencePattern: recurrence_pattern || null,
        recurrenceInterval: recurrence_interval || null,
        recurrenceDays: recurrence_days || null
      });
      await tasks.ensureTaskTag(req.session.userId, normalizedTag);
      const user = await getUserById(req.session.userId);
      let emailSent = false;

      if (normalizedPriority !== 'low') {
        try {
          emailSent = await sendTaskAlertEmail(task, user, language);
        } catch (emailError) {
          console.error('Failed to send task alert email:', emailError);
        }
      }

      emitToUser(req.session.userId, 'task:created', { task });
      res.json({ task, emailSent });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  router.put('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const {
      title, tag, description, comment, priority, status, archived, completed, time_spent_minutes, reminder_at, attachment,
      is_recurring, recurrence_pattern, recurrence_interval, recurrence_days
    } = req.body;
    const hasAttachmentUpdate = Object.prototype.hasOwnProperty.call(req.body, 'attachment');
    const hasStatusUpdate = Object.prototype.hasOwnProperty.call(req.body, 'status');
    const hasTagUpdate = Object.prototype.hasOwnProperty.call(req.body, 'tag');

    try {
      const task = await tasks.getTaskForUser(id, req.session.userId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      if (title && title.length > 20) {
        return res.status(400).json({ error: 'Task title must be 20 characters or less' });
      }

      const normalizedTag = normalizeTag(tag);
      if (hasTagUpdate && normalizedTag.length > MAX_TAG_LENGTH) {
        return res.status(400).json({ error: `Task tag must be ${MAX_TAG_LENGTH} characters or less` });
      }

      if (description && stripHtml(description).length > MAX_TASK_TEXT_LENGTH) {
        return res.status(400).json({ error: `Task description must be ${MAX_TASK_TEXT_LENGTH} characters or less` });
      }

      if (comment && String(comment).length > MAX_TASK_TEXT_LENGTH) {
        return res.status(400).json({ error: `Task comment must be ${MAX_TASK_TEXT_LENGTH} characters or less` });
      }

      const normalizedPriority = normalizePriority(priority, task.priority || 'medium');
      if (!normalizedPriority) {
        return res.status(400).json({ error: 'Task priority must be low, medium, or high' });
      }

      let normalizedStatus = normalizeStatus(status, task.status || (task.completed ? 'done' : 'todo'));
      if (hasStatusUpdate && !normalizedStatus) {
        return res.status(400).json({ error: 'Task status must be todo, in_progress, or done' });
      }
      if (!hasStatusUpdate && completed !== undefined) {
        normalizedStatus = completed ? 'done' : 'todo';
      }

      let parsedAttachment = null;
      if (hasAttachmentUpdate) {
        try {
          parsedAttachment = parseAttachment(attachment);
        } catch (attachmentError) {
          return res.status(400).json({ error: attachmentError.message });
        }
      }

      const updatedTask = await tasks.updateTask({
        id,
        userId: req.session.userId,
        existingTask: task,
        title,
        tag: normalizedTag,
        hasTagUpdate,
        description,
        comment,
        priority: normalizedPriority,
        status: normalizedStatus,
        archived,
        timeSpentMinutes: time_spent_minutes,
        reminderAt: reminder_at,
        hasAttachmentUpdate,
        attachment: parsedAttachment,
        isRecurring: is_recurring,
        recurrencePattern: recurrence_pattern,
        recurrenceInterval: recurrence_interval,
        recurrenceDays: recurrence_days
      });
      if (hasTagUpdate) {
        await tasks.ensureTaskTag(req.session.userId, normalizedTag);
      }

      // If task was marked as done and is recurring, create next instance
      if (normalizedStatus === 'done' && task.is_recurring && task.status !== 'done') {
        try {
          const nextTask = await recurrence.createNextRecurringInstance(updatedTask);
          if (nextTask) {
            emitToUser(req.session.userId, 'task:created', { task: nextTask });
          }
        } catch (recurrenceError) {
          console.error('Failed to create next recurring instance:', recurrenceError);
        }
      }

      emitToUser(req.session.userId, 'task:updated', { task: updatedTask });
      res.json({ task: updatedTask });
    } catch (error) {
      console.error(error);
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
      emitToUser(req.session.userId, 'task:deleted', { id: Number(id) });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  return router;
};

module.exports = createTasksRouter;
