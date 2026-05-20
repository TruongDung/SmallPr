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
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);

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
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
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

  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at TEXT');
  await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'");
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_name TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_type TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_data TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_size INTEGER DEFAULT 0');

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
      `Priority: ${task.priority || 'medium'}`,
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
  const taskLines = tasks.length
    ? tasks.flatMap((task, index) => [
        `${index + 1}. ${task.title}`,
        `Priority: ${task.priority || 'medium'}`,
        `Description: ${stripHtml(task.description) || 'No description provided.'}`,
        `Attachment: ${task.attachment_name || 'No attachment'}`,
        `Status: ${task.completed ? 'Completed' : 'Open'}`,
        `Date time alert: ${task.reminder_at ? new Date(task.reminder_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set'}`,
        `Created: ${task.created_at}`,
        '',
      ])
    : ['No tasks found.'];

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
      ...taskLines,
    ].join('\n'),
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
    const tasks = await allAsync('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [req.session.userId]);
    res.json({ tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load tasks' });
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
  const { title, description, priority, time_spent_minutes, reminder_at, attachment } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const normalizedPriority = normalizePriority(priority);
  if (!normalizedPriority) {
    return res.status(400).json({ error: 'Task priority must be low, medium, or high' });
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
        user_id, title, description, priority, completed, time_spent_minutes, reminder_at,
        attachment_name, attachment_type, attachment_data, attachment_size
      ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        req.session.userId,
        title,
        description || '',
        normalizedPriority,
        time_spent_minutes || 0,
        reminder_at || null,
        parsedAttachment?.name || null,
        parsedAttachment?.type || null,
        parsedAttachment?.data || null,
        parsedAttachment?.size || 0,
      ]
    );
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
  const { title, description, priority, completed, time_spent_minutes, reminder_at, attachment } = req.body;
  const hasAttachmentUpdate = Object.prototype.hasOwnProperty.call(req.body, 'attachment');

  try {
    const task = await getAsync('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Validation
    if (title && title.length > 20) {
      return res.status(400).json({ error: 'Task title must be 20 characters or less' });
    }
    
    if (description && stripHtml(description).length > 5000) {
      return res.status(400).json({ error: 'Task description must be 5000 characters or less' });
    }

    const normalizedPriority = normalizePriority(priority, task.priority || 'medium');
    if (!normalizedPriority) {
      return res.status(400).json({ error: 'Task priority must be low, medium, or high' });
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
        description = ?,
        priority = ?,
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
        description !== undefined ? description : task.description,
        normalizedPriority,
        completed !== undefined ? (completed ? 1 : 0) : task.completed,
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
