const express = require('express');

const { createTasksService } = require('../services/tasks.service');
const { createRecurrenceService } = require('../services/recurrence.service');
const { emitToUser } = require('../realtime');
const {
  validateCreateTask,
  validateTagName,
  validateUpdateTask,
} = require('../schemas/task.schema');

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
    const validation = validateTagName(req.body.name);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }
    const name = validation.value;

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
