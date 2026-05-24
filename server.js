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
const TASK_PRIORITY_ORDER_SQL = `
  CASE priority
    WHEN 'high' THEN 0
    WHEN 'medium' THEN 1
    WHEN 'low' THEN 2
    ELSE 3
  END,
  created_at DESC
`;

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
    email TEXT,
    password TEXT NOT NULL
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    tag TEXT,
    description TEXT,
    comment TEXT,
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
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tag TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS comment TEXT');
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

const EMAIL_TRANSLATIONS = {
  en: {
    taskManager: 'Task Manager',
    newTaskSubject: 'New task added',
    newTaskMessage: 'A new task was added by {username}.',
    summarySubject: 'Task summary',
    summaryMessage: 'Task summary requested by {username}.',
    number: '#',
    title: 'Title',
    tag: 'Tag',
    priority: 'Priority',
    status: 'Status',
    description: 'Description',
    comment: 'Comment',
    attachment: 'Attachment',
    dateTimeAlert: 'Date time alert',
    created: 'Created',
    todo: 'Todo',
    in_progress: 'In Progress',
    done: 'Done',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    noTag: 'No tag',
    noDescription: 'No description provided.',
    noComment: 'No comment',
    noAttachment: 'No attachment',
    notSet: 'Not set',
    noTasks: 'No tasks found.',
  },
  vi: {
    taskManager: 'Quản lý công việc',
    newTaskSubject: 'Công việc mới đã được thêm',
    newTaskMessage: 'Một công việc mới đã được thêm bởi {username}.',
    summarySubject: 'Tóm tắt công việc',
    summaryMessage: 'Tóm tắt công việc được yêu cầu bởi {username}.',
    number: '#',
    title: 'Tiêu đề',
    tag: 'Nhãn',
    priority: 'Ưu tiên',
    status: 'Trạng thái',
    description: 'Mô tả',
    comment: 'Bình luận',
    attachment: 'Tệp đính kèm',
    dateTimeAlert: 'Ngày giờ nhắc',
    created: 'Đã tạo',
    todo: 'Cần làm',
    in_progress: 'Đang làm',
    done: 'Hoàn thành',
    low: 'Thấp',
    medium: 'Trung bình',
    high: 'Cao',
    noTag: 'Không có nhãn',
    noDescription: 'Không có mô tả.',
    noComment: 'Không có bình luận',
    noAttachment: 'Không có tệp đính kèm',
    notSet: 'Chưa đặt',
    noTasks: 'Không có công việc.',
  },
};

const normalizeLanguage = (language) => (language === 'vi' ? 'vi' : 'en');

const normalizeEmail = (email) => {
  if (email === undefined || email === null) return null;
  const normalized = String(email).trim();
  return normalized || null;
};

const tEmail = (language, key, values = {}) => {
  const dictionary = EMAIL_TRANSLATIONS[normalizeLanguage(language)];
  const template = dictionary[key] || EMAIL_TRANSLATIONS.en[key] || key;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, value),
    template
  );
};

const formatTaskStatus = (status = 'todo', language = 'en') => tEmail(language, status);

const formatTaskPriority = (priority = 'medium', language = 'en') => tEmail(language, priority);

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

const getUserEmailRecipient = (user) => normalizeEmail(user?.email) || TASK_ALERT_TO;

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

const normalizeLineBreaks = (value = '') => String(value)
  .replace(/\\r\\n|\\n|\\r/g, '\n')
  .replace(/\r\n|\r|\n/g, '\n');

const formatPlainTextValue = (value = '') => normalizeLineBreaks(stripHtml(value));

const formatMultilineHtml = (value = '') => normalizeLineBreaks(value)
  .split('\n')
  .map((line) => escapeHtml(line))
  .join('<br>');

const formatLinkedMultilineHtml = (value = '') => formatMultilineHtml(value)
  .replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

const decodeBasicHtmlEntities = (value = '') => String(value)
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const linkifyEscapedHtml = (value = '') => String(value).replace(
  /(https?:\/\/[^\s<]+)/g,
  '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
);

const formatEmailTextNodeHtml = (value = '') => linkifyEscapedHtml(
  normalizeLineBreaks(decodeBasicHtmlEntities(value))
    .split('\n')
    .map((line) => escapeHtml(line))
    .join('<br>')
);

const formatRichTextEmailHtml = (value = '', fallback = '') => {
  const input = String(value || '');
  if (!formatPlainTextValue(input)) {
    return formatLinkedMultilineHtml(fallback);
  }

  let strikethroughSpanDepth = 0;

  return input
    .split(/(<[^>]+>)/g)
    .map((part) => {
      const tagMatch = part.match(/^<\s*(\/?)\s*([a-z0-9]+)([^>]*)\s*\/?\s*>$/i);
      if (!tagMatch) {
        return formatEmailTextNodeHtml(part);
      }

      const isClosing = tagMatch[1] === '/';
      const tag = tagMatch[2].toLowerCase();
      const attributes = tagMatch[3] || '';
      const isSelfClosing = /\/\s*>$/.test(part);
      const isStrikethroughSpan = tag === 'span' && /text-decoration[^>]*line-through/i.test(attributes);

      if (tag === 'br') return '<br>';
      if (tag === 'p' || tag === 'div') return isClosing ? '<br>' : '';
      if (tag === 'strong' || tag === 'b') return isClosing ? '</strong>' : '<strong>';
      if (tag === 'em' || tag === 'i') return isClosing ? '</em>' : '<em>';
      if (tag === 'u') return isClosing ? '</u>' : '<u>';
      if (tag === 'span' && isClosing) {
        if (strikethroughSpanDepth > 0) {
          strikethroughSpanDepth -= 1;
          return '</s>';
        }
        return '';
      }
      if (tag === 's' || tag === 'strike' || tag === 'del' || isStrikethroughSpan) {
        if (isStrikethroughSpan && !isClosing && !isSelfClosing) {
          strikethroughSpanDepth += 1;
        }
        return isClosing || isSelfClosing ? '</s>' : '<s style="text-decoration:line-through;">';
      }
      if (tag === 'ul') return isClosing ? '</ul>' : '<ul style="margin:4px 0 4px 18px;padding:0;">';
      if (tag === 'ol') return isClosing ? '</ol>' : '<ol style="margin:4px 0 4px 18px;padding:0;">';
      if (tag === 'li') return isClosing ? '</li>' : '<li>';

      return '';
    })
    .join('')
    .replace(/(<br>)+$/g, '');
};

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

const sendTaskAlertEmail = async (task, user, language = 'en') => {
  const transporter = createMailTransporter();
  if (!transporter) {
    console.warn('Task alert email skipped: SMTP_HOST, SMTP_USER, and SMTP_PASS are required.');
    return false;
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const to = getUserEmailRecipient(user);
  if (!to) {
    console.warn('Task alert email skipped: user email or TASK_ALERT_TO is required.');
    return false;
  }

  const locale = normalizeLanguage(language) === 'vi' ? 'vi-VN' : 'en-US';
  const taskAlertMarker = tEmail(language, 'taskManager');
  const hasTag = Boolean(task.tag);
  const hasDescription = Boolean(formatPlainTextValue(task.description));
  const hasComment = Boolean(task.comment);
  const hasAttachment = Boolean(task.attachment_name);
  const hasReminder = Boolean(task.reminder_at);
  const description = formatPlainTextValue(task.description);
  const descriptionHtml = formatRichTextEmailHtml(task.description, '');
  const reminder = hasReminder
    ? new Date(task.reminder_at).toLocaleString(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';
  const status = formatTaskStatus(task.status || (task.completed ? 'done' : 'todo'), language);
  const priority = formatTaskPriority(task.priority || 'medium', language);
  const optionalTextLines = [
    hasTag ? `${tEmail(language, 'tag')}: ${task.tag}` : null,
    `${tEmail(language, 'priority')}: ${priority}`,
    `${tEmail(language, 'status')}: ${status}`,
    hasDescription ? `${tEmail(language, 'description')}:\n${description}` : null,
    hasComment ? `${tEmail(language, 'comment')}: ${task.comment}` : null,
    hasAttachment ? `${tEmail(language, 'attachment')}: ${task.attachment_name}` : null,
    hasReminder ? `${tEmail(language, 'dateTimeAlert')}: ${reminder}` : null,
  ].filter(Boolean);
  const optionalHtmlRows = [
    hasTag ? `<p style="margin:0 0 8px;"><strong>${escapeHtml(tEmail(language, 'tag'))}:</strong> ${escapeHtml(task.tag)}</p>` : '',
    `<p style="margin:0 0 8px;"><strong>${escapeHtml(tEmail(language, 'priority'))}:</strong> ${escapeHtml(priority)}</p>`,
    `<p style="margin:0 0 8px;"><strong>${escapeHtml(tEmail(language, 'status'))}:</strong> ${escapeHtml(status)}</p>`,
    hasDescription ? `
        <div style="margin:0 0 8px;">
          <strong>${escapeHtml(tEmail(language, 'description'))}:</strong>
          <div style="margin-top:4px;white-space:normal;">${descriptionHtml}</div>
        </div>
      ` : '',
    hasComment ? `<p style="margin:0 0 8px;"><strong>${escapeHtml(tEmail(language, 'comment'))}:</strong> ${formatLinkedMultilineHtml(task.comment)}</p>` : '',
    hasAttachment ? `<p style="margin:0 0 8px;"><strong>${escapeHtml(tEmail(language, 'attachment'))}:</strong> ${escapeHtml(task.attachment_name)}</p>` : '',
    hasReminder ? `<p style="margin:0;"><strong>${escapeHtml(tEmail(language, 'dateTimeAlert'))}:</strong> ${escapeHtml(reminder)}</p>` : '',
  ].join('');

  await transporter.sendMail({
    from,
    to,
    subject: `${tEmail(language, 'newTaskSubject')}: ${task.title}`,
    headers: {
      'X-Task-Manager-Alert': taskAlertMarker,
    },
    text: [
      taskAlertMarker,
      '',
      tEmail(language, 'newTaskMessage', { username: user.username }),
      '',
      `${tEmail(language, 'title')}: ${task.title}`,
      ...optionalTextLines,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827;">
        <p style="margin:0 0 12px;font-weight:700;">${escapeHtml(taskAlertMarker)}</p>
        <p style="margin:0 0 16px;">${escapeHtml(tEmail(language, 'newTaskMessage', { username: user.username }))}</p>
        <p style="margin:0 0 8px;"><strong>${escapeHtml(tEmail(language, 'title'))}:</strong> ${escapeHtml(task.title)}</p>
        ${optionalHtmlRows}
      </div>
    `,
  });

  return true;
};

const sendTaskSummaryEmail = async (tasks, user, language = 'en') => {
  const transporter = createMailTransporter();
  if (!transporter) {
    console.warn('Task summary email skipped: SMTP_HOST, SMTP_USER, and SMTP_PASS are required.');
    return false;
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const to = getUserEmailRecipient(user);
  if (!to) {
    console.warn('Task summary email skipped: user email or TASK_ALERT_TO is required.');
    return false;
  }

  const locale = normalizeLanguage(language) === 'vi' ? 'vi-VN' : 'en-US';
  const taskAlertMarker = tEmail(language, 'taskManager');
  const formatReminder = (task) => task.reminder_at
    ? new Date(task.reminder_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
    : tEmail(language, 'notSet');
  const getTaskStatus = (task) => formatTaskStatus(task.status || (task.completed ? 'done' : 'todo'), language);
  const headings = [
    tEmail(language, 'number'),
    tEmail(language, 'title'),
    tEmail(language, 'tag'),
    tEmail(language, 'priority'),
    tEmail(language, 'status'),
    tEmail(language, 'description'),
    tEmail(language, 'comment'),
    tEmail(language, 'attachment'),
    tEmail(language, 'dateTimeAlert'),
  ];
  const taskTableRows = tasks.map((task, index) => ({
    number: index + 1,
    title: task.title,
    tag: task.tag || tEmail(language, 'noTag'),
    priority: formatTaskPriority(task.priority || 'medium', language),
    status: getTaskStatus(task),
    description: formatPlainTextValue(task.description) || tEmail(language, 'noDescription'),
    descriptionHtml: formatRichTextEmailHtml(task.description, tEmail(language, 'noDescription')),
    comment: task.comment || tEmail(language, 'noComment'),
    attachment: task.attachment_name || tEmail(language, 'noAttachment'),
    reminder: formatReminder(task),
  }));
  const textTable = taskTableRows.length
    ? [
        headings.join('\t'),
        ...taskTableRows.map((task) => [
          task.number,
          task.title,
          task.tag,
          task.priority,
          task.status,
          task.description,
          task.comment,
          task.attachment,
          task.reminder,
        ].join('\t')),
      ]
    : [tEmail(language, 'noTasks')];
  const htmlTable = taskTableRows.length
    ? `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
        <thead>
          <tr>
            ${headings.map((heading) => (
              `<th style="border:1px solid #d1d5db;padding:8px;background:#f3f4f6;text-align:left;">${escapeHtml(heading)}</th>`
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
              <td style="border:1px solid #d1d5db;padding:8px;white-space:pre-line;">${task.descriptionHtml}</td>
              <td style="border:1px solid #d1d5db;padding:8px;white-space:pre-line;">${formatMultilineHtml(task.comment)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.attachment)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.reminder)}</td>
            </tr>`
          )).join('')}
        </tbody>
      </table>`
    : `<p>${escapeHtml(tEmail(language, 'noTasks'))}</p>`;

  await transporter.sendMail({
    from,
    to,
    subject: tEmail(language, 'summarySubject'),
    headers: {
      'X-Task-Manager-Alert': taskAlertMarker,
    },
    text: [
      taskAlertMarker,
      '',
      tEmail(language, 'summaryMessage', { username: user.username }),
      '',
      ...textTable,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;">
        <p><strong>${taskAlertMarker}</strong></p>
        <p>${escapeHtml(tEmail(language, 'summaryMessage', { username: user.username }))}</p>
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
  return getAsync('SELECT id, username, email FROM users WHERE id = ?', [id]);
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
    const user = await getAsync('SELECT id, username, email, password FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    res.json({ user: { id: user.id, username: user.username, email: user.email } });
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
    const tasks = await allAsync(
      `SELECT * FROM tasks
       WHERE user_id = ? AND archived = ?
       ORDER BY ${TASK_PRIORITY_ORDER_SQL}`,
      [req.session.userId, archived]
    );
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
      `SELECT users.id, users.username, users.email, COUNT(tasks.id)::int AS task_count
       FROM users
       LEFT JOIN tasks ON tasks.user_id = users.id
       GROUP BY users.id, users.username, users.email
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
  const email = normalizeEmail(req.body.email);
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
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?) RETURNING id',
      [username, email, hashedPassword]
    );
    const user = await getAsync(
      `SELECT users.id, users.username, users.email, COUNT(tasks.id)::int AS task_count
       FROM users
       LEFT JOIN tasks ON tasks.user_id = users.id
       WHERE users.id = ?
       GROUP BY users.id, users.username, users.email`,
      [result.lastID]
    );
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/admin/users/:id', adminRequired, async (req, res) => {
  const { id } = req.params;
  const username = String(req.body.username || '').trim();
  const email = normalizeEmail(req.body.email);
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

    await runAsync('UPDATE users SET username = ?, email = ? WHERE id = ?', [username, email, id]);
    const updatedUser = await getAsync(
      `SELECT users.id, users.username, users.email, COUNT(tasks.id)::int AS task_count
       FROM users
       LEFT JOIN tasks ON tasks.user_id = users.id
       WHERE users.id = ?
       GROUP BY users.id, users.username, users.email`,
      [id]
    );
    res.json({ user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user' });
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
    const tasks = await allAsync(
      `SELECT * FROM tasks
       WHERE user_id = ?
       ORDER BY ${TASK_PRIORITY_ORDER_SQL}`,
      [req.session.userId]
    );
    const user = await getUserById(req.session.userId);
    const emailSent = await sendTaskSummaryEmail(tasks, user, req.body.language);

    if (!emailSent) {
      return res.status(500).json({ error: 'Email settings are not configured' });
    }

    res.json({ success: true, emailSent });
  } catch (error) {
    console.error('Failed to send task summary email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.post('/api/tasks/:id/send-email', authRequired, async (req, res) => {
  const { id } = req.params;

  try {
    const task = await getAsync('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const user = await getUserById(req.session.userId);
    const emailSent = await sendTaskAlertEmail(task, user, req.body.language);

    if (!emailSent) {
      return res.status(500).json({ error: 'Email settings are not configured' });
    }

    res.json({ success: true, emailSent });
  } catch (error) {
    console.error('Failed to send task email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.post('/api/tasks', authRequired, async (req, res) => {
  const { title, tag, description, comment, priority, status, time_spent_minutes, reminder_at, attachment, language } = req.body;
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
        user_id, title, tag, description, comment, priority, status, completed, time_spent_minutes, reminder_at,
        attachment_name, attachment_type, attachment_data, attachment_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        req.session.userId,
        title,
        normalizedTag,
        description || '',
        comment || '',
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
      emailSent = await sendTaskAlertEmail(task, user, language);
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
  const { title, tag, description, comment, priority, status, archived, completed, time_spent_minutes, reminder_at, attachment } = req.body;
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
        comment = ?,
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
        comment !== undefined ? comment : task.comment,
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
