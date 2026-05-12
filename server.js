require('dotenv').config();

const express = require('express');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || '/tmp/data.db';
const TASK_ALERT_TO = process.env.TASK_ALERT_TO;

if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, '');
}

const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    reminder_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.all('PRAGMA table_info(tasks)', (err, columns) => {
    if (err) {
      console.error('Error checking tasks table schema:', err);
      return;
    }

    const hasReminderAt = columns.some((column) => column.name === 'reminder_at');
    if (!hasReminderAt) {
      db.run('ALTER TABLE tasks ADD COLUMN reminder_at TEXT', (alterErr) => {
        if (alterErr) {
          console.error('Error adding reminder_at column:', alterErr);
        }
      });
    }
  });

  // Create default admin user if not exists
  db.get('SELECT id FROM users WHERE username = ?', ['admin'], async (err, row) => {
    if (err) {
      console.error('Error checking for admin user:', err);
      return;
    }
    if (!row) {
      try {
        const hashedPassword = await bcrypt.hash('admin123456', 10);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword], function(err) {
          if (err) {
            console.error('Error creating admin user:', err);
          } else {
            console.log('Default admin user created with username: admin, password: admin123456');
          }
        });
      } catch (error) {
        console.error('Error hashing password for admin:', error);
      }
    }
  });
});

const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

const getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

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
      `Description: ${stripHtml(task.description) || 'No description provided.'}`,
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
        `Description: ${stripHtml(task.description) || 'No description provided.'}`,
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

app.use(express.json());
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
    const result = await runAsync('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
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
      `SELECT users.id, users.username, COUNT(tasks.id) AS task_count
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
    const result = await runAsync('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    const user = await getAsync(
      `SELECT users.id, users.username, COUNT(tasks.id) AS task_count
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
  const { title, description, time_spent_minutes, reminder_at } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Task title is required' });
  }
  
  if (title.length > 20) {
    return res.status(400).json({ error: 'Task title must be 20 characters or less' });
  }
  
  if (description && stripHtml(description).length > 5000) {
    return res.status(400).json({ error: 'Task description must be 5000 characters or less' });
  }

  try {
    const result = await runAsync(
      'INSERT INTO tasks (user_id, title, description, completed, time_spent_minutes, reminder_at) VALUES (?, ?, ?, 0, ?, ?)',
      [req.session.userId, title, description || '', time_spent_minutes || 0, reminder_at || null]
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
  const { title, description, completed, time_spent_minutes, reminder_at } = req.body;

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

    await runAsync(
      `UPDATE tasks SET title = ?, description = ?, completed = ?, time_spent_minutes = ?, reminder_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [
        title || task.title,
        description !== undefined ? description : task.description,
        completed ? 1 : 0,
        time_spent_minutes !== undefined ? time_spent_minutes : task.time_spent_minutes,
        reminder_at !== undefined ? reminder_at || null : task.reminder_at,
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
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// module.exports = { app, db };
module.exports = app;
