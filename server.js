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
const DB_FILE = path.join(__dirname, 'data.db');
const TASK_ALERT_TO = process.env.TASK_ALERT_TO || 'truongdung0502@gmail.com';

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
        const hashedPassword = await bcrypt.hash('123456', 10);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword], function(err) {
          if (err) {
            console.error('Error creating admin user:', err);
          } else {
            console.log('Default admin user created with username: admin, password: 123456');
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

  await transporter.sendMail({
    from,
    to: TASK_ALERT_TO,
    subject: `New task added: ${task.title}`,
    text: [
      `A new task was added by ${user.username}.`,
      '',
      `Title: ${task.title}`,
      `Description: ${task.description || 'No description provided.'}`,
      `Time spent: ${task.time_spent_minutes || 0} minutes`,
      `Date time alert: ${reminder}`,
      `Created: ${task.created_at}`,
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

app.post('/api/tasks', authRequired, async (req, res) => {
  const { title, description, time_spent_minutes, reminder_at } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Task title is required' });
  }
  
  if (title.length > 20) {
    return res.status(400).json({ error: 'Task title must be 20 characters or less' });
  }
  
  if (description && description.length > 500) {
    return res.status(400).json({ error: 'Task description must be 500 characters or less' });
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
    
    if (description && description.length > 500) {
      return res.status(400).json({ error: 'Task description must be 500 characters or less' });
    }

    await runAsync(
      `UPDATE tasks SET title = ?, description = ?, completed = ?, time_spent_minutes = ?, reminder_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [
        title || task.title,
        description || task.description,
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
