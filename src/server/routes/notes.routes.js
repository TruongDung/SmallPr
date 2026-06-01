const express = require('express');

const createNotesRouter = ({ allAsync, authRequired, emitToUser, queryAsync, runAsync }) => {
  const router = express.Router();

  router.get('/notes', authRequired, async (req, res) => {
    try {
      const notes = await allAsync(
        `SELECT id, title, body, pinned, created_at, updated_at
         FROM notes
         WHERE user_id = ?
         ORDER BY pinned DESC, updated_at DESC, id DESC`,
        [req.session.userId]
      );
      res.json({ notes });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to load notes' });
    }
  });

  router.post('/notes', authRequired, async (req, res) => {
    const title = String(req.body?.title || '').slice(0, 200);
    const body = String(req.body?.body || '').slice(0, 100000);

    try {
      const result = await queryAsync(
        `INSERT INTO notes (user_id, title, body)
         VALUES (?, ?, ?)
         RETURNING id, title, body, pinned, created_at, updated_at`,
        [req.session.userId, title, body]
      );
      emitToUser(req.session.userId, 'note:created', { note: result.rows[0] });
      res.json({ note: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create note' });
    }
  });

  router.put('/notes/:id', authRequired, async (req, res) => {
    const { id } = req.params;
    const title = String(req.body?.title || '').slice(0, 200);
    const body = String(req.body?.body || '').slice(0, 100000);

    try {
      const result = await queryAsync(
        `UPDATE notes
         SET title = ?, body = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?
         RETURNING id, title, body, pinned, created_at, updated_at`,
        [title, body, id, req.session.userId]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Note not found' });
      }

      emitToUser(req.session.userId, 'note:updated', { note: result.rows[0] });
      res.json({ note: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update note' });
    }
  });

  router.patch('/notes/:id/pin', authRequired, async (req, res) => {
    const { id } = req.params;
    const pinned = Boolean(req.body?.pinned);

    try {
      const result = await queryAsync(
        `UPDATE notes
         SET pinned = ?
         WHERE id = ? AND user_id = ?
         RETURNING id, title, body, pinned, created_at, updated_at`,
        [pinned, id, req.session.userId]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Note not found' });
      }

      emitToUser(req.session.userId, 'note:updated', { note: result.rows[0] });
      res.json({ note: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update note' });
    }
  });

  router.delete('/notes/:id', authRequired, async (req, res) => {
    const { id } = req.params;

    try {
      const result = await runAsync(
        'DELETE FROM notes WHERE id = ? AND user_id = ? RETURNING id',
        [id, req.session.userId]
      );

      if (!result.lastID) {
        return res.status(404).json({ error: 'Note not found' });
      }

      emitToUser(req.session.userId, 'note:deleted', { id: Number(id) });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete note' });
    }
  });

  return router;
};

module.exports = createNotesRouter;
