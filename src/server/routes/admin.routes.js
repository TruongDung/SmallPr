const express = require('express');

const { normalizeEmail, normalizeName } = require('../utils/users');

const createAdminRouter = ({ adminRequired, allAsync, bcrypt, getAsync, runAsync }) => {
  const router = express.Router();

  router.get('/admin/users', adminRequired, async (req, res) => {
    try {
      const users = await allAsync(
        `SELECT users.id, users.username, users.name, users.email, COUNT(tasks.id)::int AS task_count
         FROM users
         LEFT JOIN tasks ON tasks.user_id = users.id
         GROUP BY users.id, users.username, users.name, users.email
         ORDER BY users.id ASC`
      );
      res.json({ users });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to load users' });
    }
  });

  router.post('/admin/users', adminRequired, async (req, res) => {
    const { username, password } = req.body;
    const email = normalizeEmail(req.body.email);
    const name = normalizeName(req.body.name);
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
      const existingUser = await getAsync('SELECT id FROM users WHERE username = ?', [username]);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await runAsync(
        'INSERT INTO users (username, name, email, password) VALUES (?, ?, ?, ?) RETURNING id',
        [username, name, email, hashedPassword]
      );
      const user = await getAsync(
        `SELECT users.id, users.username, users.name, users.email, COUNT(tasks.id)::int AS task_count
         FROM users
         LEFT JOIN tasks ON tasks.user_id = users.id
         WHERE users.id = ?
         GROUP BY users.id, users.username, users.name, users.email`,
        [result.lastID]
      );
      res.json({ user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  router.put('/admin/users/:id', adminRequired, async (req, res) => {
    const { id } = req.params;
    const username = String(req.body.username || '').trim();
    const email = normalizeEmail(req.body.email);
    const name = normalizeName(req.body.name);
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    try {
      const user = await getAsync('SELECT id, username FROM users WHERE id = ?', [id]);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const existingUser = await getAsync('SELECT id FROM users WHERE username = ? AND id <> ?', [username, id]);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      await runAsync('UPDATE users SET username = ?, name = ?, email = ? WHERE id = ?', [username, name, email, id]);
      const updatedUser = await getAsync(
        `SELECT users.id, users.username, users.name, users.email, COUNT(tasks.id)::int AS task_count
         FROM users
         LEFT JOIN tasks ON tasks.user_id = users.id
         WHERE users.id = ?
         GROUP BY users.id, users.username, users.name, users.email`,
        [id]
      );
      res.json({ user: updatedUser });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  router.put('/admin/users/:id/password', adminRequired, async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    try {
      const user = await getAsync('SELECT id, username FROM users WHERE id = ?', [id]);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await runAsync('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  router.delete('/admin/users/:id', adminRequired, async (req, res) => {
    const { id } = req.params;
    if (Number(id) === req.session.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    try {
      const user = await getAsync('SELECT id, username FROM users WHERE id = ?', [id]);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (user.username === 'admin') {
        return res.status(400).json({ error: 'The admin account cannot be deleted' });
      }

      await runAsync('DELETE FROM tasks WHERE user_id = ?', [id]);
      await runAsync('DELETE FROM users WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  return router;
};

module.exports = createAdminRouter;
