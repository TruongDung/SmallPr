const express = require('express');

const logger = require('../logger');
const { createSessionUser, normalizeEmail, normalizeName } = require('../utils/users');
const { sendNoteSummaryEmail } = require('../services/email/email.service');

const ACCOUNT_STATUSES = new Set(['enabled', 'disabled', 'pending_verification']);

const normalizeAccountStatus = (status, fallback = 'enabled') => {
  const normalized = String(status || fallback).trim().toLowerCase();
  return ACCOUNT_STATUSES.has(normalized) ? normalized : null;
};

const USER_LIST_SELECT = `SELECT users.id, users.username, users.name, users.email,
       users.account_status, users.account_status_changed_at,
       COUNT(DISTINCT tasks.id)::int AS task_count,
       COUNT(DISTINCT notes.id)::int AS note_count
       FROM users
       LEFT JOIN tasks ON tasks.user_id = users.id
       LEFT JOIN notes ON notes.user_id = users.id`;

const USER_LIST_GROUP = `GROUP BY users.id, users.username, users.name, users.email,
       users.account_status, users.account_status_changed_at`;

const createAdminRouter = ({ adminRequired, allAsync, auditLogs, bcrypt, getAsync, runAsync }) => {
  const router = express.Router();

  router.get('/admin/audit-logs', adminRequired, async (req, res) => {
    try {
      const result = await auditLogs.list({
        action: String(req.query.action || ''),
        entityType: String(req.query.entity_type || ''),
        limit: req.query.limit,
        page: req.query.page,
        search: req.query.q,
        userId: req.query.user_id ? Number(req.query.user_id) : null,
      });
      res.json(result);
    } catch (error) {
      logger.error({ err: error }, 'Failed to load audit logs');
      res.status(500).json({ error: 'Failed to load audit logs' });
    }
  });

  router.delete('/admin/audit-logs', adminRequired, async (req, res) => {
    try {
      const result = await runAsync('DELETE FROM audit_logs');
      logger.info({ rowCount: result.rowCount || result.lastID }, 'Audit logs cleared by admin');
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to clear audit logs');
      res.status(500).json({ error: 'Failed to clear audit logs' });
    }
  });

  router.get('/admin/users', adminRequired, async (req, res) => {
    try {
      const users = await allAsync(
        `${USER_LIST_SELECT}
         ${USER_LIST_GROUP}
         ORDER BY users.id ASC`
      );
      res.json({ users });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load users');
      res.status(500).json({ error: 'Failed to load users' });
    }
  });

  router.post('/admin/impersonate', adminRequired, async (req, res) => {
    const targetUserId = Number(req.body?.user_id);
    if (!Number.isInteger(targetUserId)) {
      return res.status(400).json({ error: 'User is required' });
    }

    try {
      const targetUser = await getAsync(
        'SELECT id, username, name, email, timezone, language, account_status FROM users WHERE id = ?',
        [targetUserId]
      );
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (targetUser.username === 'admin') {
        return res.status(400).json({ error: 'The admin account cannot be impersonated' });
      }
      if (targetUser.account_status !== 'enabled') {
        return res.status(400).json({ error: 'Only enabled users can be impersonated' });
      }

      req.session.impersonatorUserId = req.currentUser.id;
      req.session.userId = targetUser.id;
      res.json({ user: createSessionUser(targetUser, req.currentUser) });
    } catch (error) {
      logger.error({ err: error }, 'Failed to impersonate user');
      res.status(500).json({ error: 'Failed to impersonate user' });
    }
  });

  router.post('/admin/users', adminRequired, async (req, res) => {
    const { username, password } = req.body;
    const email = normalizeEmail(req.body.email);
    const name = normalizeName(req.body.name);
    const accountStatus = normalizeAccountStatus(req.body.account_status);
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (!accountStatus) {
      return res.status(400).json({ error: 'Account status is invalid' });
    }

    try {
      const existingUser = await getAsync('SELECT id FROM users WHERE username = ?', [username]);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await runAsync(
        `INSERT INTO users (username, name, email, password, account_status, account_status_changed_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP) RETURNING id`,
        [username, name, email, hashedPassword, accountStatus]
      );
      const user = await getAsync(
        `${USER_LIST_SELECT}
         WHERE users.id = ?
         ${USER_LIST_GROUP}`,
        [result.lastID]
      );
      await auditLogs.record({
        userId: user.id,
        actorUserId: req.currentUser.id,
        action: 'create',
        entityType: 'user',
        entityId: user.id,
        summary: user.username,
        after: user,
      });
      res.json({ user });
    } catch (error) {
      logger.error({ err: error }, 'Failed to create user');
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
      const user = await getAsync(
        'SELECT id, username, name, email, account_status, account_status_changed_at FROM users WHERE id = ?',
        [id]
      );
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const accountStatus = normalizeAccountStatus(req.body.account_status, user.account_status);
      if (!accountStatus) {
        return res.status(400).json({ error: 'Account status is invalid' });
      }
      if (user.username === 'admin' && accountStatus !== user.account_status) {
        return res.status(400).json({ error: 'The admin account status cannot be changed' });
      }
      if (accountStatus === 'disabled' && Number(id) === req.session.userId) {
        return res.status(400).json({ error: 'You cannot disable your own account' });
      }

      const existingUser = await getAsync('SELECT id FROM users WHERE username = ? AND id <> ?', [username, id]);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      await runAsync(
        `UPDATE users
         SET username = ?, name = ?, email = ?, account_status = ?,
             account_status_changed_at = CASE WHEN account_status <> ? THEN CURRENT_TIMESTAMP ELSE account_status_changed_at END
         WHERE id = ?`,
        [username, name, email, accountStatus, accountStatus, id]
      );
      const updatedUser = await getAsync(
        `${USER_LIST_SELECT}
         WHERE users.id = ?
         ${USER_LIST_GROUP}`,
        [id]
      );
      await auditLogs.record({
        userId: updatedUser.id,
        actorUserId: req.currentUser.id,
        action: 'edit',
        entityType: 'user',
        entityId: updatedUser.id,
        summary: updatedUser.username,
        before: user,
        after: updatedUser,
      });
      res.json({ user: updatedUser });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update user');
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  router.patch('/admin/users/:id/status', adminRequired, async (req, res) => {
    const { id } = req.params;
    const accountStatus = normalizeAccountStatus(req.body.account_status);
    if (!accountStatus) {
      return res.status(400).json({ error: 'Account status is invalid' });
    }

    if (accountStatus === 'disabled' && Number(id) === req.session.userId) {
      return res.status(400).json({ error: 'You cannot disable your own account' });
    }

    try {
      const user = await getAsync(
        'SELECT id, username, name, email, account_status, account_status_changed_at FROM users WHERE id = ?',
        [id]
      );
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (user.username === 'admin') {
        return res.status(400).json({ error: 'The admin account status cannot be changed' });
      }

      await runAsync(
        `UPDATE users
         SET account_status = ?,
             account_status_changed_at = CASE WHEN account_status <> ? THEN CURRENT_TIMESTAMP ELSE account_status_changed_at END
         WHERE id = ?`,
        [accountStatus, accountStatus, id]
      );
      const updatedUser = await getAsync(
        `${USER_LIST_SELECT}
         WHERE users.id = ?
         ${USER_LIST_GROUP}`,
        [id]
      );
      await auditLogs.record({
        userId: updatedUser.id,
        actorUserId: req.currentUser.id,
        action: 'edit',
        entityType: 'user',
        entityId: updatedUser.id,
        summary: updatedUser.username,
        before: user,
        after: updatedUser,
      });
      res.json({ user: updatedUser });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update user status');
      res.status(500).json({ error: 'Failed to update user status' });
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
      await auditLogs.record({
        userId: user.id,
        actorUserId: req.currentUser.id,
        action: 'edit',
        entityType: 'user',
        entityId: user.id,
        summary: `Password reset for ${user.username}`,
        before: { id: user.id, username: user.username },
        after: { id: user.id, username: user.username, password_reset: true },
      });
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update password');
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  router.delete('/admin/users/:id', adminRequired, async (req, res) => {
    const { id } = req.params;
    if (Number(id) === req.session.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    try {
      const user = await getAsync(
        'SELECT id, username, name, email, account_status, account_status_changed_at FROM users WHERE id = ?',
        [id]
      );
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (user.username === 'admin') {
        return res.status(400).json({ error: 'The admin account cannot be deleted' });
      }

      await runAsync('DELETE FROM tasks WHERE user_id = ?', [id]);
      await auditLogs.record({
        userId: user.id,
        actorUserId: req.currentUser.id,
        action: 'delete',
        entityType: 'user',
        entityId: user.id,
        summary: user.username,
        before: user,
      });
      await runAsync('DELETE FROM users WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete user');
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  router.post('/admin/notes/send-email', adminRequired, async (req, res) => {
    const language = String(req.body?.language || 'en');
    
    try {
      // Get the current user (admin) to send the email to
      const adminUser = await getAsync(
        'SELECT id, username, name, email, language FROM users WHERE id = ?',
        [req.currentUser.id]
      );
      
      if (!adminUser || !adminUser.email) {
        return res.status(400).json({ error: 'Admin user email not configured' });
      }

      // Get all notes for all enabled users
      const notes = await allAsync(
        `SELECT notes.id, notes.title, notes.body, notes.created_at, notes.updated_at,
                users.username AS owner_username
         FROM notes
         JOIN users ON users.id = notes.user_id
         WHERE users.account_status = 'enabled'
         ORDER BY notes.updated_at DESC, notes.id DESC`
      );

      // Send the email
      const sent = await sendNoteSummaryEmail(notes, adminUser, language);
      
      if (!sent) {
        return res.status(500).json({ error: 'Failed to send email. Check SMTP configuration.' });
      }

      res.json({ success: true, count: notes.length });
    } catch (error) {
      logger.error({ err: error }, 'Failed to send notes email');
      res.status(500).json({ error: 'Failed to send notes email' });
    }
  });

  return router;
};

module.exports = createAdminRouter;
