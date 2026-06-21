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

const TEST_USER_MATCH_SQL = `LOWER(username) = 'test'
       OR LOWER(username) LIKE 'test-%'
       OR LOWER(username) LIKE 'test!_%' ESCAPE '!'`;

const toNumber = (value) => Number(value || 0);

const createAdminRouter = ({ adminRequired, allAsync, auditLogs, featureFlags, bcrypt, getAsync, runAsync }) => {
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

  router.get('/admin/audit-logs/settings', adminRequired, async (req, res) => {
    try {
      const settings = await auditLogs.getSettings();
      res.json({ settings });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load audit log settings');
      res.status(500).json({ error: 'Failed to load audit log settings' });
    }
  });

  router.put('/admin/audit-logs/settings', adminRequired, async (req, res) => {
    if (typeof req.body?.enabled !== 'boolean') {
      return res.status(400).json({ error: 'Audit log saving setting is required' });
    }

    try {
      const settings = await auditLogs.setEnabled(req.body.enabled);
      res.json({ settings });
    } catch (error) {
      logger.error({ err: error }, 'Failed to save audit log settings');
      res.status(500).json({ error: 'Failed to save audit log settings' });
    }
  });

  // --- Feature flags: Weather access for demo users (legacy alias) ---
  router.get('/admin/settings/weather-demo', adminRequired, async (req, res) => {
    if (!featureFlags) {
      return res.status(500).json({ error: 'Feature flags are not configured' });
    }
    try {
      const enabled = await featureFlags.getWeatherEnabledForDemo();
      res.json({ settings: { weatherEnabledForDemo: enabled } });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load weather demo setting');
      res.status(500).json({ error: 'Failed to load weather demo setting' });
    }
  });

  router.put('/admin/settings/weather-demo', adminRequired, async (req, res) => {
    if (!featureFlags) {
      return res.status(500).json({ error: 'Feature flags are not configured' });
    }
    if (typeof req.body?.enabled !== 'boolean') {
      return res.status(400).json({ error: 'Weather demo setting is required' });
    }

    try {
      const before = await featureFlags.getWeatherEnabledForDemo();
      const result = await featureFlags.setWeatherEnabledForDemo(req.body.enabled);

      if (auditLogs?.record && before !== result.weatherEnabledForDemo) {
        await auditLogs.record({
          actorUserId: req.currentUser.id,
          userId: req.currentUser.id,
          action: 'edit',
          entityType: 'user',
          entityId: req.currentUser.id,
          summary: `Weather feature for demo users ${result.weatherEnabledForDemo ? 'enabled' : 'disabled'}`,
          before: { weather: before },
          after: { weather: result.weatherEnabledForDemo },
        });
      }

      res.json({ settings: result });
    } catch (error) {
      logger.error({ err: error }, 'Failed to save weather demo setting');
      res.status(500).json({ error: 'Failed to save weather demo setting' });
    }
  });

  // --- Feature flags: Granular demo feature visibility ---
  router.get('/admin/settings/demo-visibility', adminRequired, async (req, res) => {
    if (!featureFlags) {
      return res.status(500).json({ error: 'Feature flags are not configured' });
    }
    try {
      const settings = await featureFlags.getSettings();
      res.json({ settings });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load demo visibility settings');
      res.status(500).json({ error: 'Failed to load demo visibility settings' });
    }
  });

  router.put('/admin/settings/demo-visibility', adminRequired, async (req, res) => {
    if (!featureFlags) {
      return res.status(500).json({ error: 'Feature flags are not configured' });
    }

    const updates = req.body?.visibility;
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ error: 'A visibility object is required' });
    }

    // Validate provided fields are booleans (financialTabs is a nested map).
    const isBoolIfPresent = (value) => value === undefined || typeof value === 'boolean';
    if (!isBoolIfPresent(updates.weather) || !isBoolIfPresent(updates.financial)) {
      return res.status(400).json({ error: 'Visibility flags must be boolean' });
    }
    if (updates.financialTabs !== undefined) {
      if (typeof updates.financialTabs !== 'object' || updates.financialTabs === null || Array.isArray(updates.financialTabs)) {
        return res.status(400).json({ error: 'financialTabs must be an object' });
      }
      const validTabIds = new Set(featureFlags.FINANCIAL_TAB_IDS || []);
      for (const [tabId, value] of Object.entries(updates.financialTabs)) {
        if (!validTabIds.has(tabId)) {
          return res.status(400).json({ error: `Unknown financial tab: ${tabId}` });
        }
        if (typeof value !== 'boolean') {
          return res.status(400).json({ error: 'financialTabs values must be boolean' });
        }
      }
    }

    try {
      const before = await featureFlags.getDemoVisibility();
      const after = await featureFlags.setDemoVisibility(updates);

      if (auditLogs?.record && JSON.stringify(before) !== JSON.stringify(after)) {
        await auditLogs.record({
          actorUserId: req.currentUser.id,
          userId: req.currentUser.id,
          action: 'edit',
          entityType: 'user',
          entityId: req.currentUser.id,
          summary: 'Demo feature visibility updated',
          before,
          after,
        });
      }

      res.json({ settings: { demoVisibility: after } });
    } catch (error) {
      logger.error({ err: error }, 'Failed to save demo visibility settings');
      res.status(500).json({ error: 'Failed to save demo visibility settings' });
    }
  });

  // --- Financial tab labels (admin-editable) ---
  router.get('/admin/tab-labels', async (req, res) => {
    try {
      const row = await getAsync(
        "SELECT setting_value FROM app_settings WHERE setting_key = 'financial_tab_labels'"
      );
      res.json({ labels: row?.setting_value || {} });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load tab labels');
      res.status(500).json({ error: 'Failed to load tab labels' });
    }
  });

  router.put('/admin/tab-labels', adminRequired, async (req, res) => {
    const labels = req.body?.labels;
    if (!labels || typeof labels !== 'object') {
      return res.status(400).json({ error: 'Labels object is required' });
    }
    // Sanitize: only allow string values, max 50 chars
    const sanitized = {};
    for (const [key, value] of Object.entries(labels)) {
      if (typeof value === 'string' && value.trim()) {
        sanitized[key] = value.trim().slice(0, 50);
      }
    }
    try {
      await runAsync(
        `INSERT INTO app_settings (setting_key, setting_value, updated_at)
         VALUES ('financial_tab_labels', $1::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1::jsonb, updated_at = CURRENT_TIMESTAMP`,
        [JSON.stringify(sanitized)]
      );
      res.json({ labels: sanitized });
    } catch (error) {
      logger.error({ err: error }, 'Failed to save tab labels');
      res.status(500).json({ error: 'Failed to save tab labels' });
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

  router.get('/admin/database/storage', adminRequired, async (req, res) => {
    try {
      const summary = await getAsync(
        `SELECT current_database() AS database_name,
                pg_database_size(current_database())::bigint AS database_bytes`
      );
      const tables = await allAsync(
        `SELECT
           ns.nspname AS schema_name,
           cls.relname AS table_name,
           COALESCE(stats.n_live_tup, cls.reltuples::bigint, 0)::bigint AS estimated_rows,
           pg_relation_size(cls.oid)::bigint AS table_bytes,
           pg_indexes_size(cls.oid)::bigint AS index_bytes,
           pg_total_relation_size(cls.oid)::bigint AS total_bytes
         FROM pg_class cls
         JOIN pg_namespace ns ON ns.oid = cls.relnamespace
         LEFT JOIN pg_stat_user_tables stats ON stats.relid = cls.oid
         WHERE cls.relkind IN ('r', 'p')
           AND ns.nspname NOT IN ('pg_catalog', 'information_schema')
           AND ns.nspname NOT LIKE 'pg_toast%'
         ORDER BY pg_total_relation_size(cls.oid) DESC,
                  ns.nspname ASC,
                  cls.relname ASC`
      );

      res.json({
        summary: {
          databaseName: summary?.database_name || '',
          databaseBytes: toNumber(summary?.database_bytes),
          tableCount: tables.length,
          capturedAt: new Date().toISOString(),
        },
        tables: tables.map((table) => ({
          schemaName: table.schema_name,
          tableName: table.table_name,
          estimatedRows: toNumber(table.estimated_rows),
          tableBytes: toNumber(table.table_bytes),
          indexBytes: toNumber(table.index_bytes),
          totalBytes: toNumber(table.total_bytes),
        })),
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load database storage');
      res.status(500).json({ error: 'Failed to load database storage' });
    }
  });

  // Reindex a single table to reclaim bloat in its indexes.
  router.post('/admin/database/reindex', adminRequired, async (req, res) => {
    const schemaName = String(req.body?.schemaName || '').trim();
    const tableName = String(req.body?.tableName || '').trim();

    // Strict allow-list: only safe identifier chars (letters, numbers, underscores)
    // to defend against SQL injection since identifiers can't be parameterized.
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return res.status(400).json({ error: 'Invalid schema or table name' });
    }

    // Verify the table actually exists before issuing REINDEX.
    try {
      const exists = await getAsync(
        `SELECT 1 FROM pg_class cls
         JOIN pg_namespace ns ON ns.oid = cls.relnamespace
         WHERE ns.nspname = ? AND cls.relname = ? AND cls.relkind IN ('r', 'p')`,
        [schemaName, tableName]
      );
      if (!exists) {
        return res.status(404).json({ error: 'Table not found' });
      }

      // REINDEX rebuilds all indexes on the table, reclaiming bloat.
      // Identifiers are quoted with double-quotes; the regex above already
      // restricted them to safe characters so injection is not possible.
      await runAsync(`REINDEX TABLE "${schemaName}"."${tableName}"`);
      logger.info({ schemaName, tableName, actorUserId: req.currentUser.id }, 'Indexes reclaimed for table');
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error, schemaName, tableName }, 'Failed to reindex table');
      res.status(500).json({ error: 'Failed to reindex table' });
    }
  });

  router.delete('/admin/users/test', adminRequired, async (req, res) => {
    try {
      const testUsers = await allAsync(
        `SELECT id, username, name, email, account_status, account_status_changed_at
         FROM users
         WHERE (${TEST_USER_MATCH_SQL})
           AND LOWER(username) <> 'admin'
           AND id <> ?
         ORDER BY id ASC`,
        [req.session.userId]
      );

      if (!testUsers.length) {
        return res.json({ success: true, deletedCount: 0, users: [] });
      }

      await auditLogs.record({
        userId: req.currentUser.id,
        actorUserId: req.currentUser.id,
        action: 'delete',
        entityType: 'user',
        entityId: null,
        summary: `Deleted ${testUsers.length} test user${testUsers.length === 1 ? '' : 's'}`,
        before: { users: testUsers },
      });

      const deleteResult = await runAsync(
        `DELETE FROM users
         WHERE id = ANY(?::int[])
           AND (${TEST_USER_MATCH_SQL})
           AND LOWER(username) <> 'admin'
           AND id <> ?`,
        [testUsers.map((user) => Number(user.id)), req.session.userId]
      );
      const deletedCount = deleteResult.changes ?? testUsers.length;

      res.json({
        success: true,
        deletedCount,
        users: testUsers.map((user) => ({ id: user.id, username: user.username })),
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete test users');
      res.status(500).json({ error: 'Failed to delete test users' });
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
