const express = require('express');

const { NOTE_PAGE_CACHE_TTL_SECONDS } = require('../config/env');
const logger = require('../logger');
const { createAuditContext } = require('../services/auditLog.service');

const NOTE_SELECT = `
  notes.id,
  notes.title,
  notes.body,
  notes.pinned,
  notes.task_id,
  tasks.title AS task_title,
  notes.created_at,
  notes.updated_at
`;

const normalizeTaskId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
};

const HISTORY_PAGE_SIZE = 10;
const HISTORY_MAX_PAGE_SIZE = 50;

const normalizePositiveInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 1) return fallback;
  return Math.min(normalized, max);
};

const buildNoteListCacheKey = ({ userId, search }) => [
  'user',
  userId,
  'notes',
  'v1',
  encodeURIComponent(search || 'all'),
].join(':');

const buildNoteVersionsCacheKey = ({ userId, noteId, page, limit }) => [
  'user',
  userId,
  'note-versions',
  'v1',
  encodeURIComponent(String(noteId)),
  page,
  limit,
].join(':');

const sendCachedJson = ({ res, payload, cacheStatus }) => {
  res.set('X-Redis-Cache', cacheStatus);
  res.set('X-Note-Cache-TTL', String(NOTE_PAGE_CACHE_TTL_SECONDS));
  res.json(payload);
};

const createNotesRouter = ({ allAsync, auditLogs, authRequired, cache, emitToUser, queryAsync, runAsync }) => {
  const router = express.Router();

  router.get('/notes', authRequired, async (req, res) => {
    const search = String(req.query?.q || '').trim().slice(0, 200);
    const cacheKey = buildNoteListCacheKey({ userId: req.session.userId, search });
    const params = [req.session.userId];
    const searchClause = search
      ? `AND to_tsvector('simple', COALESCE(notes.title, '') || ' ' || COALESCE(notes.body, ''))
           @@ plainto_tsquery('simple', ?)`
      : '';
    if (search) params.push(search);

    try {
      const cachedPayload = await cache?.get(cacheKey);
      if (cachedPayload) {
        return sendCachedJson({ res, payload: cachedPayload, cacheStatus: 'HIT' });
      }

      const notes = await allAsync(
        `SELECT ${NOTE_SELECT}
         FROM notes
         LEFT JOIN tasks ON tasks.id = notes.task_id AND tasks.user_id = notes.user_id
         WHERE notes.user_id = ?
         ${searchClause}
         ORDER BY notes.pinned DESC, notes.updated_at DESC, notes.id DESC`,
        params
      );
      const payload = { notes };
      await cache?.set(cacheKey, payload, NOTE_PAGE_CACHE_TTL_SECONDS);
      sendCachedJson({ res, payload, cacheStatus: cache ? 'MISS' : 'BYPASS' });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load notes');
      res.status(500).json({ error: 'Failed to load notes' });
    }
  });

  router.post('/notes', authRequired, async (req, res) => {
    const title = String(req.body?.title || '').slice(0, 200);
    const body = String(req.body?.body || '').slice(0, 100000);
    const taskId = normalizeTaskId(req.body?.task_id);

    try {
      if (taskId) {
        const task = await allAsync(
          'SELECT id FROM tasks WHERE id = ? AND user_id = ? LIMIT 1',
          [taskId, req.session.userId]
        );
        if (!task.length) {
          return res.status(400).json({ error: 'Linked task not found' });
        }
      }

      const result = await queryAsync(
        `INSERT INTO notes (user_id, title, body, task_id)
         VALUES (?, ?, ?, ?)
         RETURNING id`,
        [req.session.userId, title, body, taskId]
      );
      const note = (await allAsync(
        `SELECT ${NOTE_SELECT}
         FROM notes
         LEFT JOIN tasks ON tasks.id = notes.task_id AND tasks.user_id = notes.user_id
         WHERE notes.id = ? AND notes.user_id = ?`,
        [result.rows[0].id, req.session.userId]
      ))[0];
      await auditLogs.record({
        ...createAuditContext(req),
        action: 'create',
        entityType: 'note',
        entityId: note.id,
        summary: note.title,
        after: note,
      });
      emitToUser(req.session.userId, 'note:created', { note });
      res.json({ note });
    } catch (error) {
      logger.error({ err: error }, 'Failed to create note');
      res.status(500).json({ error: 'Failed to create note' });
    }
  });

  router.put('/notes/:id', authRequired, async (req, res) => {
    const { id } = req.params;
    const title = String(req.body?.title || '').slice(0, 200);
    const body = String(req.body?.body || '').slice(0, 100000);
    const taskId = normalizeTaskId(req.body?.task_id);

    try {
      const existing = (await allAsync(
        'SELECT id, title, body, task_id FROM notes WHERE id = ? AND user_id = ? LIMIT 1',
        [id, req.session.userId]
      ))[0];
      if (!existing) {
        return res.status(404).json({ error: 'Note not found' });
      }

      if (taskId) {
        const task = await allAsync(
          'SELECT id FROM tasks WHERE id = ? AND user_id = ? LIMIT 1',
          [taskId, req.session.userId]
        );
        if (!task.length) {
          return res.status(400).json({ error: 'Linked task not found' });
        }
      }

      await queryAsync(
        `INSERT INTO note_versions (note_id, user_id, title, body, task_id)
         VALUES (?, ?, ?, ?, ?)`,
        [existing.id, req.session.userId, existing.title, existing.body, existing.task_id]
      );

      const result = await queryAsync(
        `UPDATE notes
         SET title = ?, body = ?, task_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?
         RETURNING id`,
        [title, body, taskId, id, req.session.userId]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const note = (await allAsync(
        `SELECT ${NOTE_SELECT}
         FROM notes
         LEFT JOIN tasks ON tasks.id = notes.task_id AND tasks.user_id = notes.user_id
         WHERE notes.id = ? AND notes.user_id = ?`,
        [id, req.session.userId]
      ))[0];
      await auditLogs.record({
        ...createAuditContext(req),
        action: 'edit',
        entityType: 'note',
        entityId: note.id,
        summary: note.title,
        before: existing,
        after: note,
      });
      emitToUser(req.session.userId, 'note:updated', { note });
      res.json({ note });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update note');
      res.status(500).json({ error: 'Failed to update note' });
    }
  });

  router.patch('/notes/:id/pin', authRequired, async (req, res) => {
    const { id } = req.params;
    const pinned = Boolean(req.body?.pinned);

    try {
      const existing = (await allAsync(
        `SELECT ${NOTE_SELECT}
         FROM notes
         LEFT JOIN tasks ON tasks.id = notes.task_id AND tasks.user_id = notes.user_id
         WHERE notes.id = ? AND notes.user_id = ?
         LIMIT 1`,
        [id, req.session.userId]
      ))[0];
      if (!existing) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const result = await queryAsync(
        `UPDATE notes
         SET pinned = ?
         WHERE id = ? AND user_id = ?
         RETURNING id`,
        [pinned, id, req.session.userId]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const note = (await allAsync(
        `SELECT ${NOTE_SELECT}
         FROM notes
         LEFT JOIN tasks ON tasks.id = notes.task_id AND tasks.user_id = notes.user_id
         WHERE notes.id = ? AND notes.user_id = ?`,
        [id, req.session.userId]
      ))[0];
      await auditLogs.record({
        ...createAuditContext(req),
        action: 'edit',
        entityType: 'note',
        entityId: note.id,
        summary: note.title,
        before: existing,
        after: note,
      });
      emitToUser(req.session.userId, 'note:updated', { note });
      res.json({ note });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update note');
      res.status(500).json({ error: 'Failed to update note' });
    }
  });

  router.delete('/notes/:id', authRequired, async (req, res) => {
    const { id } = req.params;

    try {
      const existing = (await allAsync(
        `SELECT ${NOTE_SELECT}
         FROM notes
         LEFT JOIN tasks ON tasks.id = notes.task_id AND tasks.user_id = notes.user_id
         WHERE notes.id = ? AND notes.user_id = ?
         LIMIT 1`,
        [id, req.session.userId]
      ))[0];
      if (!existing) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const result = await runAsync(
        'DELETE FROM notes WHERE id = ? AND user_id = ? RETURNING id',
        [id, req.session.userId]
      );

      if (!result.lastID) {
        return res.status(404).json({ error: 'Note not found' });
      }

      await auditLogs.record({
        ...createAuditContext(req),
        action: 'delete',
        entityType: 'note',
        entityId: existing.id,
        summary: existing.title,
        before: existing,
      });
      emitToUser(req.session.userId, 'note:deleted', { id: Number(id) });
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete note');
      res.status(500).json({ error: 'Failed to delete note' });
    }
  });

  router.get('/notes/:id/versions', authRequired, async (req, res) => {
    const { id } = req.params;
    const requestedPage = normalizePositiveInteger(req.query?.page, 1);
    const limit = normalizePositiveInteger(req.query?.limit, HISTORY_PAGE_SIZE, HISTORY_MAX_PAGE_SIZE);

    try {
      const note = await allAsync(
        'SELECT id FROM notes WHERE id = ? AND user_id = ? LIMIT 1',
        [id, req.session.userId]
      );
      if (!note.length) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const cacheKey = buildNoteVersionsCacheKey({
        userId: req.session.userId,
        noteId: id,
        page: requestedPage,
        limit,
      });
      const cachedPayload = await cache?.get(cacheKey);
      if (cachedPayload) {
        return sendCachedJson({ res, payload: cachedPayload, cacheStatus: 'HIT' });
      }

      const totalRows = await allAsync(
        `SELECT COUNT(*)::int AS total
         FROM note_versions
         WHERE note_id = ? AND user_id = ?`,
        [id, req.session.userId]
      );
      const total = Number(totalRows[0]?.total || 0);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const page = total ? Math.min(requestedPage, totalPages) : 1;
      const offset = (page - 1) * limit;

      const versions = await allAsync(
        `SELECT note_versions.id, note_versions.note_id, note_versions.title, note_versions.body,
                note_versions.task_id, tasks.title AS task_title, note_versions.created_at
         FROM note_versions
         LEFT JOIN tasks ON tasks.id = note_versions.task_id AND tasks.user_id = note_versions.user_id
         WHERE note_versions.note_id = ? AND note_versions.user_id = ?
         ORDER BY note_versions.created_at DESC, note_versions.id DESC
         LIMIT ? OFFSET ?`,
        [id, req.session.userId, limit, offset]
      );
      const payload = {
        versions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
      };
      await cache?.set(cacheKey, payload, NOTE_PAGE_CACHE_TTL_SECONDS);
      sendCachedJson({ res, payload, cacheStatus: cache ? 'MISS' : 'BYPASS' });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load note history');
      res.status(500).json({ error: 'Failed to load note history' });
    }
  });

  return router;
};

module.exports = createNotesRouter;
module.exports.buildNoteListCacheKey = buildNoteListCacheKey;
module.exports.buildNoteVersionsCacheKey = buildNoteVersionsCacheKey;
