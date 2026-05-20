require('dotenv').config();

const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const session = require('express-session');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const TASK_ALERT_TO = process.env.TASK_ALERT_TO;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_TAG_LENGTH = 40;
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);
const VALID_STATUSES = new Set(['todo', 'in_progress', 'done']);

if (!DATABASE_URL || DATABASE_URL.includes('[YOUR-PASSWORD]')) {
  throw new Error('DATABASE_URL must be set to your Supabase Postgres connection string.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

const toPostgresSql = (sql) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

const queryAsync = async (sql, params = []) => {
  return pool.query(toPostgresSql(sql), params);
};

const runAsync = async (sql, params = []) => {
  const result = await queryAsync(sql, params);
  return {
    changes: result.rowCount,
    lastID: result.rows[0]?.id,
  };
};

const getAsync = async (sql, params = []) => {
  const result = await queryAsync(sql, params);
  return result.rows[0];
};

const allAsync = async (sql, params = []) => {
  const result = await queryAsync(sql, params);
  return result.rows;
};

const initializeDatabase = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    tag TEXT,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'todo',
    archived INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    reminder_at TEXT,
    attachment_name TEXT,
    attachment_type TEXT,
    attachment_data TEXT,
    attachment_size INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS task_tags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, normalized_name),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tag TEXT');
  await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'");
  await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'todo'");
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived INTEGER NOT NULL DEFAULT 0');
  await pool.query("UPDATE tasks SET status = 'done' WHERE completed = 1 AND status = 'todo'");
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_name TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_type TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_data TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_size INTEGER DEFAULT 0');
  await pool.query(`
    INSERT INTO task_tags (user_id, name, normalized_name)
    SELECT DISTINCT user_id, tag, LOWER(tag)
    FROM tasks
    WHERE tag IS NOT NULL AND TRIM(tag) <> ''
    ON CONFLICT (user_id, normalized_name) DO NOTHING
  `);

  const admin = await getAsync('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin123456', 10);
    await runAsync(
      'INSERT INTO users (username, password) VALUES (?, ?) RETURNING id',
      ['admin', hashedPassword]
    );
    console.log('Default admin user created with username: admin, password: admin123456');
  }
};

const dbReady = initializeDatabase();

const normalizePriority = (priority, fallback = 'medium') => {
  if (priority === undefined || priority === null || priority === '') {
    return fallback;
  }

  const normalized = String(priority).toLowerCase();
  return VALID_PRIORITIES.has(normalized) ? normalized : null;
};

const normalizeStatus = (status, fallback = 'todo') => {
  if (status === undefined || status === null || status === '') {
    return fallback;
  }

  const normalized = String(status).toLowerCase();
  return VALID_STATUSES.has(normalized) ? normalized : null;
};

const normalizeTag = (tag) => {
  if (tag === undefined || tag === null) {
    return '';
  }

  return String(tag).trim();
};

const ensureTaskTag = async (userId, tag) => {
  const normalizedTag = normalizeTag(tag);
  if (!normalizedTag) {
    return null;
  }

  const normalizedName = normalizedTag.toLowerCase();
  await runAsync(
    `INSERT INTO task_tags (user_id, name, normalized_name)
     VALUES (?, ?, ?)
     ON CONFLICT (user_id, normalized_name) DO NOTHING
     RETURNING id`,
    [userId, normalizedTag, normalizedName]
  );
  return getAsync(
    'SELECT id, name FROM task_tags WHERE user_id = ? AND normalized_name = ?',
    [userId, normalizedName]
  );
};

const createMailTransporter = () => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const stripHtml = (value = '') => String(value)
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|li)>/gi, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const sanitizeFileName = (name = '') => path.basename(String(name)).replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').slice(0, 180);

const parseAttachment = (attachment) => {
  if (!attachment) return null;

  const name = sanitizeFileName(attachment.name);
  const data = String(attachment.data || '');
  const type = String(attachment.type || 'application/octet-stream').slice(0, 120);
  const size = Number(attachment.size) || 0;

  if (!name || !data.startsWith('data:')) {
    throw new Error('Invalid attachment');
  }

  if (size > MAX_ATTACHMENT_BYTES || Buffer.byteLength(data, 'utf8') > MAX_ATTACHMENT_BYTES * 1.5) {
    throw new Error('File must be 5 MB or less');
  }

  return { name, type, data, size };
};

const sendTaskAlertEmail = async (task, user) => {
  const transporter = createMailTransporter();
  if (!transporter) {
    console.warn('Task alert email skipped: SMTP_HOST, SMTP_USER, and SMTP_PASS are required.');
    return false;
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const reminder = task.reminder_at
    ? new Date(task.reminder_at).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not set';

  const taskAlertMarker = 'Task Manager';

  await transporter.sendMail({
    from,
    to: TASK_ALERT_TO,
    subject: `New task added: ${task.title}`,
    headers: {
      'X-Task-Manager-Alert': taskAlertMarker,
    },
    text: [
      taskAlertMarker,
      '',
      `A new task was added by ${user.username}.`,
      '',
      `Title: ${task.title}`,
      `Tag: ${task.tag || 'No tag'}`,
      `Priority: ${task.priority || 'medium'}`,
      `Status: ${task.status || (task.completed ? 'done' : 'todo')}`,
      `Description: ${stripHtml(task.description) || 'No description provided.'}`,
      `Attachment: ${task.attachment_name || 'No attachment'}`,
      `Date time alert: ${reminder}`,
      `Created: ${task.created_at}`,
    ].join('\n'),
  });

  return true;
};

const sendTaskSummaryEmail = async (tasks, user) => {
  const transporter = createMailTransporter();
  if (!transporter) {
    console.warn('Task summary email skipped: SMTP_HOST, SMTP_USER, and SMTP_PASS are required.');
    return false;
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const taskAlertMarker = 'Task Manager';
  const formatReminder = (task) => task.reminder_at
    ? new Date(task.reminder_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not set';
  const getTaskStatus = (task) => task.status || (task.completed ? 'done' : 'todo');
  const taskTableRows = tasks.map((task, index) => ({
    number: index + 1,
    title: task.title,
    tag: task.tag || 'No tag',
    priority: task.priority || 'medium',
    status: getTaskStatus(task),
    description: stripHtml(task.description) || 'No description provided.',
    attachment: task.attachment_name || 'No attachment',
    reminder: formatReminder(task),
    created: task.created_at,
  }));
  const textTable = taskTableRows.length
    ? [
        ['#', 'Title', 'Tag', 'Priority', 'Status', 'Description', 'Attachment', 'Date time alert', 'Created'].join('\t'),
        ...taskTableRows.map((task) => [
          task.number,
          task.title,
          task.tag,
          task.priority,
          task.status,
          task.description,
          task.attachment,
          task.reminder,
          task.created,
        ].join('\t')),
      ]
    : ['No tasks found.'];
  const htmlTable = taskTableRows.length
    ? `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
        <thead>
          <tr>
            ${['#', 'Title', 'Tag', 'Priority', 'Status', 'Description', 'Attachment', 'Date time alert', 'Created'].map((heading) => (
              `<th style="border:1px solid #d1d5db;padding:8px;background:#f3f4f6;text-align:left;">${heading}</th>`
            )).join('')}
          </tr>
        </thead>
        <tbody>
          ${taskTableRows.map((task) => (
            `<tr>
              <td style="border:1px solid #d1d5db;padding:8px;">${task.number}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.title)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.tag)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.priority)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.status)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.description)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.attachment)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.reminder)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.created)}</td>
            </tr>`
          )).join('')}
        </tbody>
      </table>`
    : '<p>No tasks found.</p>';

  await transporter.sendMail({
    from,
    to: TASK_ALERT_TO,
    subject: 'Task summary',
    headers: {
      'X-Task-Manager-Alert': taskAlertMarker,
    },
    text: [
      taskAlertMarker,
      '',
      `Task summary requested by ${user.username}.`,
      '',
      ...textTable,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;">
        <p><strong>${taskAlertMarker}</strong></p>
        <p>Task summary requested by ${escapeHtml(user.username)}.</p>
        ${htmlTable}
      </div>
    `,
  });

  return true;
};

app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'task-manager-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(async (req, res, next) => {
  try {
    await dbReady;
    next();
  } catch (error) {
    console.error('Database initialization failed:', error);
    res.status(500).json({ error: 'Database is not configured correctly' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const authRequired = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const getUserById = async (id) => {
  return getAsync('SELECT id, username FROM users WHERE id = ?', [id]);
};

const adminRequired = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await getUserById(req.session.userId);
    if (!user || user.username !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.currentUser = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify admin access' });
  }
};

app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const existingUser = await getAsync('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await runAsync('INSERT INTO users (username, password) VALUES (?, ?) RETURNING id', [username, hashedPassword]);
    req.session.userId = result.lastID;

    res.json({ user: { id: result.lastID, username } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await getAsync('SELECT id, username, password FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    res.json({ user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

app.get('/api/me', async (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }

  try {
    const user = await getUserById(req.session.userId);
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

app.get('/api/tasks', authRequired, async (req, res) => {
  try {
    const archived = req.query.archived === 'true' ? 1 : 0;
    const tasks = await allAsync('SELECT * FROM tasks WHERE user_id = ? AND archived = ? ORDER BY created_at DESC', [req.session.userId, archived]);
    res.json({ tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

app.get('/api/tags', authRequired, async (req, res) => {
  try {
    const tags = await allAsync(
      'SELECT id, name FROM task_tags WHERE user_id = ? ORDER BY LOWER(name), name',
      [req.session.userId]
    );
    res.json({ tags });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load tags' });
  }
});

app.post('/api/tags', authRequired, async (req, res) => {
  const name = normalizeTag(req.body.name);
  if (!name) {
    return res.status(400).json({ error: 'Tag name is required' });
  }
  if (name.length > MAX_TAG_LENGTH) {
    return res.status(400).json({ error: `Tag name must be ${MAX_TAG_LENGTH} characters or less` });
  }

  try {
    const tag = await ensureTaskTag(req.session.userId, name);
    res.json({ tag });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save tag' });
  }
});

app.put('/api/tags/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  const name = normalizeTag(req.body.name);
  if (!name) {
    return res.status(400).json({ error: 'Tag name is required' });
  }
  if (name.length > MAX_TAG_LENGTH) {
    return res.status(400).json({ error: `Tag name must be ${MAX_TAG_LENGTH} characters or less` });
  }

  try {
    const tag = await getAsync('SELECT id, name FROM task_tags WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const normalizedName = name.toLowerCase();
    const existing = await getAsync(
      'SELECT id, name FROM task_tags WHERE user_id = ? AND normalized_name = ?',
      [req.session.userId, normalizedName]
    );

    if (existing && Number(existing.id) !== Number(id)) {
      await runAsync('UPDATE tasks SET tag = ? WHERE user_id = ? AND LOWER(tag) = LOWER(?)', [existing.name, req.session.userId, tag.name]);
      await runAsync('DELETE FROM task_tags WHERE id = ? AND user_id = ?', [id, req.session.userId]);
      return res.json({ tag: existing });
    }

    await runAsync(
      'UPDATE task_tags SET name = ?, normalized_name = ? WHERE id = ? AND user_id = ?',
      [name, normalizedName, id, req.session.userId]
    );
    await runAsync('UPDATE tasks SET tag = ? WHERE user_id = ? AND LOWER(tag) = LOWER(?)', [name, req.session.userId, tag.name]);
    const updatedTag = await getAsync('SELECT id, name FROM task_tags WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    res.json({ tag: updatedTag });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

app.delete('/api/tags/:id', authRequired, async (req, res) => {
  const { id } = req.params;

  try {
    const tag = await getAsync('SELECT id, name FROM task_tags WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    await runAsync('UPDATE tasks SET tag = ? WHERE user_id = ? AND LOWER(tag) = LOWER(?)', ['', req.session.userId, tag.name]);
    await runAsync('DELETE FROM task_tags WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

app.get('/api/admin/users', adminRequired, async (req, res) => {
  try {
    const users = await allAsync(
      `SELECT users.id, users.username, COUNT(tasks.id)::int AS task_count
       FROM users
       LEFT JOIN tasks ON tasks.user_id = users.id
       GROUP BY users.id, users.username
       ORDER BY users.id ASC`
    );
    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

app.post('/api/admin/users', adminRequired, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const existingUser = await getAsync('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await runAsync('INSERT INTO users (username, password) VALUES (?, ?) RETURNING id', [username, hashedPassword]);
    const user = await getAsync(
      `SELECT users.id, users.username, COUNT(tasks.id)::int AS task_count
       FROM users
       LEFT JOIN tasks ON tasks.user_id = users.id
       WHERE users.id = ?
       GROUP BY users.id, users.username`,
      [result.lastID]
    );
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/admin/users/:id/password', adminRequired, async (req, res) => {
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

app.delete('/api/admin/users/:id', adminRequired, async (req, res) => {
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

app.post('/api/tasks/send-email', authRequired, async (req, res) => {
  try {
    const tasks = await allAsync('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [req.session.userId]);
    const user = await getUserById(req.session.userId);
    const emailSent = await sendTaskSummaryEmail(tasks, user);

    if (!emailSent) {
      return res.status(500).json({ error: 'Email settings are not configured' });
    }

    res.json({ success: true, emailSent });
  } catch (error) {
    console.error('Failed to send task summary email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.post('/api/tasks', authRequired, async (req, res) => {
  const { title, tag, description, priority, status, time_spent_minutes, reminder_at, attachment } = req.body;
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
  
  if (description && stripHtml(description).length > 5000) {
    return res.status(400).json({ error: 'Task description must be 5000 characters or less' });
  }

  let parsedAttachment = null;
  try {
    parsedAttachment = parseAttachment(attachment);
  } catch (attachmentError) {
    return res.status(400).json({ error: attachmentError.message });
  }

  try {
    const result = await runAsync(
      `INSERT INTO tasks (
        user_id, title, tag, description, priority, status, completed, time_spent_minutes, reminder_at,
        attachment_name, attachment_type, attachment_data, attachment_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        req.session.userId,
        title,
        normalizedTag,
        description || '',
        normalizedPriority,
        normalizedStatus,
        normalizedStatus === 'done' ? 1 : 0,
        time_spent_minutes || 0,
        reminder_at || null,
        parsedAttachment?.name || null,
        parsedAttachment?.type || null,
        parsedAttachment?.data || null,
        parsedAttachment?.size || 0,
      ]
    );
    await ensureTaskTag(req.session.userId, normalizedTag);
    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', [result.lastID]);
    const user = await getUserById(req.session.userId);
    let emailSent = false;

    try {
      emailSent = await sendTaskAlertEmail(task, user);
    } catch (emailError) {
      console.error('Failed to send task alert email:', emailError);
    }

    res.json({ task, emailSent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  const { title, tag, description, priority, status, archived, completed, time_spent_minutes, reminder_at, attachment } = req.body;
  const hasAttachmentUpdate = Object.prototype.hasOwnProperty.call(req.body, 'attachment');
  const hasStatusUpdate = Object.prototype.hasOwnProperty.call(req.body, 'status');
  const hasTagUpdate = Object.prototype.hasOwnProperty.call(req.body, 'tag');

  try {
    const task = await getAsync('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Validation
    if (title && title.length > 20) {
      return res.status(400).json({ error: 'Task title must be 20 characters or less' });
    }

    const normalizedTag = normalizeTag(tag);
    if (hasTagUpdate && normalizedTag.length > MAX_TAG_LENGTH) {
      return res.status(400).json({ error: `Task tag must be ${MAX_TAG_LENGTH} characters or less` });
    }
    
    if (description && stripHtml(description).length > 5000) {
      return res.status(400).json({ error: 'Task description must be 5000 characters or less' });
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

    await runAsync(
      `UPDATE tasks SET
        title = ?,
        tag = ?,
        description = ?,
        priority = ?,
        status = ?,
        archived = ?,
        completed = ?,
        time_spent_minutes = ?,
        reminder_at = ?,
        attachment_name = ?,
        attachment_type = ?,
        attachment_data = ?,
        attachment_size = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        title || task.title,
        hasTagUpdate ? normalizedTag : task.tag,
        description !== undefined ? description : task.description,
        normalizedPriority,
        normalizedStatus,
        archived !== undefined ? (archived ? 1 : 0) : task.archived,
        normalizedStatus === 'done' ? 1 : 0,
        time_spent_minutes !== undefined ? time_spent_minutes : task.time_spent_minutes,
        reminder_at !== undefined ? reminder_at || null : task.reminder_at,
        hasAttachmentUpdate ? parsedAttachment?.name || null : task.attachment_name,
        hasAttachmentUpdate ? parsedAttachment?.type || null : task.attachment_type,
        hasAttachmentUpdate ? parsedAttachment?.data || null : task.attachment_data,
        hasAttachmentUpdate ? parsedAttachment?.size || 0 : task.attachment_size,
        id,
        req.session.userId
      ]
    );
    if (hasTagUpdate) {
      await ensureTaskTag(req.session.userId, normalizedTag);
    }

    const updatedTask = await getAsync('SELECT * FROM tasks WHERE id = ?', [id]);
    res.json({ task: updatedTask });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:id', authRequired, async (req, res) => {
  const { id } = req.params;

  try {
    const task = await getAsync('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await runAsync('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  dbReady
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    });
}

module.exports = app;
module.exports.app = app;
module.exports.db = pool;
module.exports.dbReady = dbReady;
