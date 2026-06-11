const express = require('express');
const logger = require('../logger');
const { createSprintsService } = require('../services/sprints.service');
const { emitToUser } = require('../realtime');

const SPRINT_STATUSES = new Set(['planned', 'active', 'completed']);

const validateSprintInput = (body = {}, isCreate = false) => {
  const { name, goal, start_date, end_date, status } = body;

  if (isCreate && !name) {
    return { error: 'Sprint name is required' };
  }
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return { error: 'Sprint name must be a non-empty string' };
  }
  if (name && name.length > 200) {
    return { error: 'Sprint name must be 200 characters or less' };
  }
  if (goal !== undefined && goal !== null && typeof goal === 'string' && goal.length > 2000) {
    return { error: 'Sprint goal must be 2000 characters or less' };
  }
  if (status !== undefined && !SPRINT_STATUSES.has(status)) {
    return { error: 'Sprint status must be planned, active, or completed' };
  }

  return {
    value: {
      name: name ? String(name).trim() : name,
      goal: goal !== undefined ? (goal || null) : undefined,
      startDate: start_date !== undefined ? (start_date || null) : undefined,
      endDate: end_date !== undefined ? (end_date || null) : undefined,
      status: status || (isCreate ? 'planned' : undefined),
    },
  };
};

const buildSprintsCacheKey = (userId) => `user:${userId}:sprints:v1`;

const createSprintsRouter = ({
  authRequired,
  allAsync,
  cache = null,
  getAsync,
  runAsync,
}) => {
  const router = express.Router();
  const sprints = createSprintsService({ allAsync, getAsync, runAsync });

  router.use('/sprints', authRequired);

  router.get('/sprints', async (req, res) => {
    try {
      const cacheKey = buildSprintsCacheKey(req.session.userId);
      const cached = await cache?.getJson?.(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const rows = await sprints.listSprints(req.session.userId);
      const payload = { sprints: rows };
      await cache?.setJson?.(cacheKey, payload, 300);
      res.json(payload);
    } catch (error) {
      logger.error({ err: error }, 'Failed to load sprints');
      res.status(500).json({ error: 'Failed to load sprints' });
    }
  });

  router.post('/sprints', async (req, res) => {
    const validation = validateSprintInput(req.body, true);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }
    const { name, goal, startDate, endDate, status } = validation.value;

    try {
      const sprint = await sprints.createSprint({
        userId: req.session.userId,
        name,
        goal,
        startDate,
        endDate,
        status,
      });
      await cache?.deleteByPattern?.(buildSprintsCacheKey(req.session.userId));
      emitToUser(req.session.userId, 'sprint:created', { sprint });
      res.json({ sprint });
    } catch (error) {
      logger.error({ err: error }, 'Failed to create sprint');
      res.status(500).json({ error: 'Failed to create sprint' });
    }
  });

  router.put('/sprints/:id', async (req, res) => {
    const { id } = req.params;

    const existing = await sprints.getSprintForUser(id, req.session.userId);
    if (!existing) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    const validation = validateSprintInput(req.body, false);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }
    const input = validation.value;

    try {
      const sprint = await sprints.updateSprint({
        id,
        userId: req.session.userId,
        name: input.name !== undefined ? input.name : existing.name,
        goal: input.goal !== undefined ? input.goal : existing.goal,
        startDate: input.startDate !== undefined ? input.startDate : existing.start_date,
        endDate: input.endDate !== undefined ? input.endDate : existing.end_date,
        status: input.status !== undefined ? input.status : existing.status,
      });
      await cache?.deleteByPattern?.(buildSprintsCacheKey(req.session.userId));
      emitToUser(req.session.userId, 'sprint:updated', { sprint });
      res.json({ sprint });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update sprint');
      res.status(500).json({ error: 'Failed to update sprint' });
    }
  });

  router.delete('/sprints/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const existing = await sprints.getSprintForUser(id, req.session.userId);
      if (!existing) {
        return res.status(404).json({ error: 'Sprint not found' });
      }

      await sprints.deleteSprint(id, req.session.userId);
      await cache?.deleteByPattern?.(buildSprintsCacheKey(req.session.userId));
      // Also clear task caches since sprint_id on tasks is now NULL
      await cache?.deleteByPattern?.(`user:${req.session.userId}:tasks:*`);
      emitToUser(req.session.userId, 'sprint:deleted', { id: Number(id) });
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete sprint');
      res.status(500).json({ error: 'Failed to delete sprint' });
    }
  });

  return router;
};

module.exports = createSprintsRouter;
