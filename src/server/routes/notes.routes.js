const express = require('express');

const { NOTE_PAGE_CACHE_TTL_SECONDS } = require('../config/env');
const logger = require('../logger');
const { createAuditContext } = require('../services/auditLog.service');

const NOTE_SELECT = `
  notes.id,
  notes.title,
  notes.body,
  notes.pinned,
  notes.folder_id,
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
      const cachedPayload = await cache?.getJson?.(cacheKey);
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
      const wroteCache = await cache?.setJson?.(cacheKey, payload, NOTE_PAGE_CACHE_TTL_SECONDS);
      sendCachedJson({ res, payload, cacheStatus: wroteCache ? 'MISS' : 'BYPASS' });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load notes');
      res.status(500).json({ error: 'Failed to load notes' });
    }
  });

  router.post('/notes', authRequired, async (req, res) => {
    const title = String(req.body?.title || '').slice(0, 200);
    const body = String(req.body?.body || '').slice(0, 100000);
    const taskId = normalizeTaskId(req.body?.task_id);
    const folderId = normalizePositiveInteger(req.body?.folder_id, null);

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

      if (folderId) {
        const folder = await allAsync(
          'SELECT id FROM note_folders WHERE id = ? AND user_id = ? LIMIT 1',
          [folderId, req.session.userId]
        );
        if (!folder.length) {
          return res.status(400).json({ error: 'Folder not found' });
        }
      }

      const result = await queryAsync(
        `INSERT INTO notes (user_id, title, body, task_id, folder_id)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id`,
        [req.session.userId, title, body, taskId, folderId]
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

  router.post('/notes/send-email', authRequired, async (req, res) => {
    try {
      const rows = await allAsync(
        `SELECT id, title, body, created_at, updated_at
         FROM notes
         WHERE user_id = ?
         ORDER BY updated_at DESC, id DESC`,
        [req.session.userId]
      );
      res.json({ success: true, count: rows.length });
    } catch (error) {
      logger.error({ err: error }, 'Failed to send notes email');
      res.status(500).json({ error: 'Failed to send notes email' });
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
      const cachedPayload = await cache?.getJson?.(cacheKey);
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
      const wroteCache = await cache?.setJson?.(cacheKey, payload, NOTE_PAGE_CACHE_TTL_SECONDS);
      sendCachedJson({ res, payload, cacheStatus: wroteCache ? 'MISS' : 'BYPASS' });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load note history');
      res.status(500).json({ error: 'Failed to load note history' });
    }
  });

  router.get('/note-folders', authRequired, async (req, res) => {
    try {
      const folders = await allAsync(
        `SELECT id, name, description, sort_order, created_at, updated_at
         FROM note_folders
         WHERE user_id = ?
         ORDER BY sort_order ASC, name ASC`,
        [req.session.userId]
      );
      res.json({ folders });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load note folders');
      res.status(500).json({ error: 'Failed to load note folders' });
    }
  });

  router.post('/note-folders', authRequired, async (req, res) => {
    const name = String(req.body?.name || '').slice(0, 100).trim();
    const description = String(req.body?.description || '').slice(0, 500);

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    try {
      const result = await queryAsync(
        `INSERT INTO note_folders (user_id, name, description, sort_order)
         VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM note_folders WHERE user_id = ?))
         RETURNING id`,
        [req.session.userId, name, description, req.session.userId]
      );

      const folder = (await allAsync(
        'SELECT id, name, description, sort_order, created_at, updated_at FROM note_folders WHERE id = ?',
        [result.rows[0].id]
      ))[0];

      await auditLogs.record({
        ...createAuditContext(req),
        action: 'create',
        entityType: 'note_folder',
        entityId: folder.id,
        summary: folder.name,
        after: folder,
      });

      emitToUser(req.session.userId, 'folder:created', { folder });
      res.json({ folder });
    } catch (error) {
      if (error.message?.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Folder name already exists' });
      }
      logger.error({ err: error }, 'Failed to create note folder');
      res.status(500).json({ error: 'Failed to create note folder' });
    }
  });

  router.put('/note-folders/:id', authRequired, async (req, res) => {
    const { id } = req.params;
    const name = String(req.body?.name || '').slice(0, 100).trim();
    const description = String(req.body?.description || '').slice(0, 500);

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    try {
      const existing = (await allAsync(
        'SELECT id, name, description FROM note_folders WHERE id = ? AND user_id = ? LIMIT 1',
        [id, req.session.userId]
      ))[0];

      if (!existing) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      const result = await queryAsync(
        `UPDATE note_folders
         SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?
         RETURNING id`,
        [name, description, id, req.session.userId]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      const folder = (await allAsync(
        'SELECT id, name, description, sort_order, created_at, updated_at FROM note_folders WHERE id = ?',
        [id]
      ))[0];

      await auditLogs.record({
        ...createAuditContext(req),
        action: 'edit',
        entityType: 'note_folder',
        entityId: folder.id,
        summary: folder.name,
        before: existing,
        after: folder,
      });

      emitToUser(req.session.userId, 'folder:updated', { folder });
      res.json({ folder });
    } catch (error) {
      if (error.message?.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Folder name already exists' });
      }
      logger.error({ err: error }, 'Failed to update note folder');
      res.status(500).json({ error: 'Failed to update note folder' });
    }
  });

  router.delete('/note-folders/:id', authRequired, async (req, res) => {
    const { id } = req.params;

    try {
      const existing = (await allAsync(
        'SELECT id, name FROM note_folders WHERE id = ? AND user_id = ? LIMIT 1',
        [id, req.session.userId]
      ))[0];

      if (!existing) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      // Move notes in this folder to root (null folder_id)
      await queryAsync(
        'UPDATE notes SET folder_id = NULL WHERE folder_id = ? AND user_id = ?',
        [id, req.session.userId]
      );

      const result = await runAsync(
        'DELETE FROM note_folders WHERE id = ? AND user_id = ? RETURNING id',
        [id, req.session.userId]
      );

      if (!result.lastID) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      await auditLogs.record({
        ...createAuditContext(req),
        action: 'delete',
        entityType: 'note_folder',
        entityId: existing.id,
        summary: existing.name,
        before: existing,
      });

      emitToUser(req.session.userId, 'folder:deleted', { id: Number(id) });
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete note folder');
      res.status(500).json({ error: 'Failed to delete note folder' });
    }
  });

  // Update note's folder
  router.patch('/notes/:id/folder', authRequired, async (req, res) => {
    const { id } = req.params;
    const folderId = normalizePositiveInteger(req.body?.folder_id, null);

    try {
      const note = (await allAsync(
        'SELECT id, folder_id FROM notes WHERE id = ? AND user_id = ? LIMIT 1',
        [id, req.session.userId]
      ))[0];

      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Verify folder exists if provided
      if (folderId) {
        const folder = await allAsync(
          'SELECT id FROM note_folders WHERE id = ? AND user_id = ? LIMIT 1',
          [folderId, req.session.userId]
        );
        if (!folder.length) {
          return res.status(400).json({ error: 'Folder not found' });
        }
      }

      const result = await queryAsync(
        `UPDATE notes
         SET folder_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?
         RETURNING id`,
        [folderId, id, req.session.userId]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const updatedNote = (await allAsync(
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
        entityId: updatedNote.id,
        summary: updatedNote.title,
        before: { folder_id: note.folder_id },
        after: { folder_id: folderId },
      });

      emitToUser(req.session.userId, 'note:updated', { note: updatedNote });
      res.json({ note: updatedNote });
    } catch (error) {
      logger.error({ err: error }, 'Failed to move note to folder');
      res.status(500).json({ error: 'Failed to move note to folder' });
    }
  });

  return router;

};

module.exports = createNotesRouter;
module.exports.buildNoteListCacheKey = buildNoteListCacheKey;
module.exports.buildNoteVersionsCacheKey = buildNoteVersionsCacheKey;
