const express = require('express');
const logger = require('../logger');
const { createSprintsService } = require('../services/sprints.service');
const { emitToUser } = require('../realtime');

const SPRINT_STATUSES = new Set(['planned', 'active', 'completed']);

const normalizeEditorUserIds = (value) => {
  if (value === undefined || value === null || value === '') {
    return { value: [] };
  }

  const entries = Array.isArray(value) ? value : [value];
  const ids = [];
  for (const entry of entries) {
    if (entry === undefined || entry === null || entry === '') continue;
    const id = Number(entry);
    if (!Number.isInteger(id) || id <= 0) {
      return { error: 'Sprint editors must be valid users' };
    }
    ids.push(id);
  }

  return { value: [...new Set(ids)] };
};

const validateSprintInput = (body = {}, isCreate = false) => {
  const { name, goal, start_date, end_date, status, editor_user_id, editor_user_ids } = body;
  const hasEditorIdsUpdate = Object.prototype.hasOwnProperty.call(body, 'editor_user_ids');
  const hasEditorIdUpdate = Object.prototype.hasOwnProperty.call(body, 'editor_user_id');
  const hasEditorUpdate = hasEditorIdsUpdate || hasEditorIdUpdate;

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

  let editorUserIds;
  if (hasEditorUpdate) {
    const editors = normalizeEditorUserIds(hasEditorIdsUpdate ? editor_user_ids : editor_user_id);
    if (editors.error) {
      return { error: editors.error };
    }
    editorUserIds = editors.value;
  }

  return {
    value: {
      name: name ? String(name).trim() : name,
      goal: goal !== undefined ? (goal || null) : undefined,
      startDate: start_date !== undefined ? (start_date || null) : undefined,
      endDate: end_date !== undefined ? (end_date || null) : undefined,
      status: status || (isCreate ? 'planned' : undefined),
      editorUserIds,
      hasEditorUpdate,
    },
  };
};

const buildSprintsCacheKey = (userId) => `user:${userId}:sprints:v1`;

const isAdmin = (req) => req.currentUser?.username === 'admin';

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

  const clearSprintUserCaches = async (userIds = []) => {
    const uniqueIds = [...new Set(userIds.map(Number).filter(Number.isInteger))];
    await Promise.all(uniqueIds.map(async (userId) => {
      await cache?.deleteByPattern?.(buildSprintsCacheKey(userId));
      await cache?.deleteByPattern?.(`user:${userId}:tasks:*`);
    }));
  };

  const validateEditorAssignments = async ({ req, ownerUserId, editorUserIds }) => {
    if (editorUserIds === undefined) {
      return { editorUserIds, hasEditorUpdate: false };
    }
    if (!isAdmin(req)) {
      return { error: 'Only admin can assign sprint editors' };
    }
    if (!editorUserIds.length) {
      return { editorUserIds: [], hasEditorUpdate: true };
    }

    if (editorUserIds.some((editorUserId) => Number(editorUserId) === Number(ownerUserId))) {
      return { error: 'Sprint editors must be different users from the owner' };
    }

    const editors = await sprints.listAssignableEditors(editorUserIds);
    const validEditorIds = new Set(editors
      .filter((editor) => editor.username !== 'admin')
      .map((editor) => Number(editor.id)));
    if (validEditorIds.size !== editorUserIds.length) {
      return { error: 'Sprint editors must be enabled non-admin users' };
    }

    return { editorUserIds, hasEditorUpdate: true };
  };

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
    const { name, goal, startDate, endDate, status, editorUserIds } = validation.value;

    try {
      const editorAssignment = await validateEditorAssignments({
        req,
        ownerUserId: req.session.userId,
        editorUserIds: validation.value.hasEditorUpdate ? editorUserIds : undefined,
      });
      if (editorAssignment.error) {
        return res.status(400).json({ error: editorAssignment.error });
      }

      const sprint = await sprints.createSprint({
        userId: req.session.userId,
        name,
        goal,
        startDate,
        endDate,
        status,
        editorUserIds: editorAssignment.editorUserIds || [],
      });
      const accessUserIds = await sprints.listSprintAccessUserIds(sprint.id);
      await clearSprintUserCaches(accessUserIds);
      accessUserIds.forEach((userId) => emitToUser(userId, 'sprint:created', { sprint }));
      res.json({ sprint });
    } catch (error) {
      logger.error({ err: error }, 'Failed to create sprint');
      res.status(500).json({ error: 'Failed to create sprint' });
    }
  });

  router.put('/sprints/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const existing = await sprints.getSprintForUser(id, req.session.userId);
      if (!existing) {
        return res.status(404).json({ error: 'Sprint not found' });
      }

      const validation = validateSprintInput(req.body, false);
      if (validation.error) {
        return res.status(400).json({ error: validation.error });
      }
      const input = validation.value;
      const previousAccessUserIds = await sprints.listSprintAccessUserIds(id);
      const editorAssignment = await validateEditorAssignments({
        req,
        ownerUserId: existing.owner_user_id || existing.user_id,
        editorUserIds: input.hasEditorUpdate ? input.editorUserIds : undefined,
      });
      if (editorAssignment.error) {
        return res.status(400).json({ error: editorAssignment.error });
      }

      const sprint = await sprints.updateSprint({
        id,
        userId: req.session.userId,
        name: input.name !== undefined ? input.name : existing.name,
        goal: input.goal !== undefined ? input.goal : existing.goal,
        startDate: input.startDate !== undefined ? input.startDate : existing.start_date,
        endDate: input.endDate !== undefined ? input.endDate : existing.end_date,
        status: input.status !== undefined ? input.status : existing.status,
        editorUserIds: editorAssignment.editorUserIds,
        hasEditorUpdate: editorAssignment.hasEditorUpdate,
      });
      const accessUserIds = await sprints.listSprintAccessUserIds(id);
      await clearSprintUserCaches([...previousAccessUserIds, ...accessUserIds]);
      [...new Set([...previousAccessUserIds, ...accessUserIds])]
        .forEach((userId) => emitToUser(userId, 'sprint:updated', { sprint }));
      res.json({ sprint });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update sprint');
      res.status(500).json({ error: 'Failed to update sprint' });
    }
  });

  router.delete('/sprints/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const isAdmin = req.currentUser?.username === 'admin';
      const existing = isAdmin
        ? await sprints.getSprintForUser(id, req.session.userId)
        : await sprints.getOwnedSprintForUser(id, req.session.userId);
      if (!existing) {
        return res.status(404).json({ error: 'Sprint not found' });
      }

      const accessUserIds = await sprints.listSprintAccessUserIds(id);
      await sprints.deleteSprint(id, req.session.userId, { allowAnyOwner: isAdmin });
      await clearSprintUserCaches(accessUserIds);
      accessUserIds.forEach((userId) => emitToUser(userId, 'sprint:deleted', { id: Number(id) }));
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete sprint');
      res.status(500).json({ error: 'Failed to delete sprint' });
    }
  });

  return router;
};

module.exports = createSprintsRouter;
