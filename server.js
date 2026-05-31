require('dotenv').config();

const http = require('http');
const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const path = require('path');
const nodemailer = require('nodemailer');
const { Server: SocketIOServer } = require('socket.io');
const { PORT, TASK_ALERT_TO } = require('./src/server/config/env');
const { allAsync, getAsync, pool, queryAsync, runAsync } = require('./src/server/db/client');
const { emitToUser } = require('./src/server/realtime');
const createCreditCardsRouter = require('./src/server/routes/creditCards.routes');
const createTasksRouter = require('./src/server/routes/tasks.routes');
const createDashboardRouter = require('./src/server/routes/dashboard.routes');
const createTransactionsRouter = require('./src/server/routes/transactions.routes');
const { fetchDailyQuote, DEFAULT_DAILY_QUOTE } = require('./src/server/services/dailyQuote.service');

const app = express();
const MAX_WEATHER_CITY_LENGTH = 120;

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

  await pool.query(`CREATE TABLE IF NOT EXISTS weather_cities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    weather_key TEXT NOT NULL,
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, weather_key),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS credit_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    total_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    interest_charge NUMERIC(12, 2) NOT NULL DEFAULT 0,
    closing_date TEXT,
    card_user TEXT,
    issuer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS fast_access_bills (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    item TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    due_date TEXT,
    pay_before TEXT,
    status TEXT NOT NULL DEFAULT 'Unpaid',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS fast_access_bill_defaults (
    id SERIAL PRIMARY KEY,
    item TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    due_date TEXT,
    pay_before TEXT,
    status TEXT NOT NULL DEFAULT 'Unpaid',
    sort_order INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    occurred_on DATE NOT NULL,
    kind TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    category TEXT,
    account TEXT,
    note TEXT,
    credit_card_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL
  )`);

  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at TEXT');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT');
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
  await pool.query('ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS total_balance NUMERIC(12, 2) NOT NULL DEFAULT 0');
  await pool.query('ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS interest_charge NUMERIC(12, 2) NOT NULL DEFAULT 0');
  await pool.query('ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS closing_date TEXT');
  await pool.query('ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS card_user TEXT');
  await pool.query('ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS issuer TEXT');
  await pool.query('ALTER TABLE fast_access_bills ADD COLUMN IF NOT EXISTS due_date TEXT');
  await pool.query('ALTER TABLE fast_access_bills ADD COLUMN IF NOT EXISTS pay_before TEXT');
  await pool.query("ALTER TABLE fast_access_bills ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Unpaid'");
  await pool.query('ALTER TABLE fast_access_bills ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0');
  await pool.query('ALTER TABLE fast_access_bill_defaults ADD COLUMN IF NOT EXISTS due_date TEXT');
  await pool.query('ALTER TABLE fast_access_bill_defaults ADD COLUMN IF NOT EXISTS pay_before TEXT');
  await pool.query("ALTER TABLE fast_access_bill_defaults ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Unpaid'");
  await pool.query('ALTER TABLE fast_access_bill_defaults ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB');

  // Seed the standard fast-access bills if the table is empty (fresh DB, CI, etc.).
  // Existing rows are preserved because sort_order is UNIQUE.
  // Amounts are placeholders — users customize them through the UI.
  await pool.query(`
    INSERT INTO fast_access_bill_defaults (item, amount, due_date, pay_before, status, sort_order)
    VALUES
      ('Rent',        0.00, '', '', 'Unpaid', 1),
      ('Electricity', 0.00, '', '', 'Unpaid', 2),
      ('Water',       0.00, '', '', 'Unpaid', 3),
      ('Gas',         0.00, '', '', 'Unpaid', 4),
      ('Internet',    0.00, '', '', 'Unpaid', 5),
      ('Phone',       0.00, '', '', 'Unpaid', 6),
      ('HOA',         0.00, '', '', 'Unpaid', 7),
      ('Auto loan',   0.00, '', '', 'Unpaid', 8),
      ('Daycare',     0.00, '', '', 'Unpaid', 9)
    ON CONFLICT (sort_order) DO NOTHING
  `);

  await pool.query(`
    INSERT INTO task_tags (user_id, name, normalized_name)
    SELECT DISTINCT user_id, tag, LOWER(tag)
    FROM tasks
    WHERE tag IS NOT NULL AND TRIM(tag) <> ''
    ON CONFLICT (user_id, normalized_name) DO NOTHING
  `);

  const admin = await getAsync('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!admin) {
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!defaultAdminPassword) {
      console.warn('Default admin user was not created: DEFAULT_ADMIN_PASSWORD is not set.');
      return;
    }

    const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
    await runAsync(
      'INSERT INTO users (username, password) VALUES (?, ?) RETURNING id',
      ['admin', hashedPassword]
    );
    console.log('Default admin user created.');
  }
};

const dbReady = initializeDatabase();

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

const normalizeName = (name) => {
  if (name === undefined || name === null) return null;
  const normalized = String(name).trim();
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

const normalizeWeatherCity = (body = {}) => {
  const name = String(body.name || '').trim().slice(0, MAX_WEATHER_CITY_LENGTH);
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const weatherKey = String(body.weather_key || body.weatherKey || body.id || `${latitude.toFixed(3)},${longitude.toFixed(3)}`).trim();

  if (!name || !weatherKey || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return {
    name,
    latitude,
    longitude,
    weatherKey: weatherKey.slice(0, 80),
  };
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

  const port = Number(SMTP_PORT) || 587;
  const secure = SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    // For STARTTLS ports (587/25), require an upgrade to TLS so the connection
    // is encrypted even though `secure` is false.
    requireTLS: !secure,
    tls: { minVersion: 'TLSv1.2' },
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // Fail fast on Vercel (10s function timeout) instead of hanging on SMTP.
    connectionTimeout: 7000,
    greetingTimeout: 5000,
    socketTimeout: 7000,
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

// Vercel terminates TLS at the edge and forwards plain HTTP to the function.
// Without this, Express marks the connection as "insecure" and refuses to send
// secure cookies, breaking sessions in production.
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';

const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'task-manager-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
  },
});

app.use(sessionMiddleware);

// HTTP server + Socket.IO so the web app and iOS WebView stay in sync.
// Socket.IO needs a persistent connection — works locally and on any
// long-running Node host (Render, Railway, Fly.io). Vercel's serverless
// functions cannot hold the connection open, so events won't broadcast
// there even though the rest of the API still works.
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: false },
});
require('./src/server/realtime').setIo(io);

// Share the express-session middleware with Socket.IO so we can authenticate
// the connection and scope events to the signed-in user.
io.engine.use(sessionMiddleware);

io.on('connection', (socket) => {
  const session = socket.request?.session;
  const userId = session?.userId;
  if (!userId) {
    socket.disconnect(true);
    return;
  }
  socket.join(`user:${userId}`);
});

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
  return getAsync('SELECT id, username, name, email FROM users WHERE id = ?', [id]);
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

app.use('/api/credit-cards', createCreditCardsRouter({
  authRequired,
  allAsync,
  getAsync,
  runAsync,
}));

app.use('/api/transactions', createTransactionsRouter({
  authRequired,
  allAsync,
  getAsync,
  runAsync,
}));

app.use('/api', createTasksRouter({
  authRequired,
  allAsync,
  getAsync,
  runAsync,
  getUserById,
  sendTaskAlertEmail,
  sendTaskSummaryEmail,
}));

app.use('/api', createDashboardRouter({
  authRequired,
  allAsync,
  getAsync,
  runAsync,
}));

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
    const user = await getAsync('SELECT id, username, name, email, password FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    res.json({ user: { id: user.id, username: user.username, name: user.name, email: user.email } });
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

app.get('/api/daily-quote', async (req, res) => {
  try {
    const quote = await fetchDailyQuote();
    res.json({ quote });
  } catch (error) {
    console.error(error);
    res.json({ quote: DEFAULT_DAILY_QUOTE });
  }
});

app.get('/api/weather-cities', authRequired, async (req, res) => {
  try {
    const cities = await allAsync(
      `SELECT id, weather_key, name, latitude, longitude
       FROM weather_cities
       WHERE user_id = ?
       ORDER BY LOWER(name), name`,
      [req.session.userId]
    );
    res.json({ cities });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load weather cities' });
  }
});

app.post('/api/weather-cities', authRequired, async (req, res) => {
  const city = normalizeWeatherCity(req.body);
  if (!city) {
    return res.status(400).json({ error: 'Valid city weather data is required' });
  }

  try {
    const result = await queryAsync(
      `INSERT INTO weather_cities (user_id, weather_key, name, latitude, longitude)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, weather_key)
       DO UPDATE SET
         name = EXCLUDED.name,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, weather_key, name, latitude, longitude`,
      [req.session.userId, city.weatherKey, city.name, city.latitude, city.longitude]
    );
    res.json({ city: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save weather city' });
  }
});

app.delete('/api/weather-cities/:id', authRequired, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await runAsync(
      'DELETE FROM weather_cities WHERE id = ? AND user_id = ? RETURNING id',
      [id, req.session.userId]
    );

    if (!result.lastID) {
      return res.status(404).json({ error: 'Weather city not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete weather city' });
  }
});

app.get('/api/notes', authRequired, async (req, res) => {
  try {
    const notes = await allAsync(
      `SELECT id, title, body, created_at, updated_at
       FROM notes
       WHERE user_id = ?
       ORDER BY updated_at DESC, id DESC`,
      [req.session.userId]
    );
    res.json({ notes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load notes' });
  }
});

app.post('/api/notes', authRequired, async (req, res) => {
  const title = String(req.body?.title || '').slice(0, 200);
  const body = String(req.body?.body || '').slice(0, 100000);

  try {
    const result = await queryAsync(
      `INSERT INTO notes (user_id, title, body)
       VALUES (?, ?, ?)
       RETURNING id, title, body, created_at, updated_at`,
      [req.session.userId, title, body]
    );
    emitToUser(req.session.userId, 'note:created', { note: result.rows[0] });
    res.json({ note: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

app.put('/api/notes/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  const title = String(req.body?.title || '').slice(0, 200);
  const body = String(req.body?.body || '').slice(0, 100000);

  try {
    const result = await queryAsync(
      `UPDATE notes
       SET title = ?, body = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?
       RETURNING id, title, body, created_at, updated_at`,
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

app.delete('/api/notes/:id', authRequired, async (req, res) => {
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

app.get('/api/admin/users', adminRequired, async (req, res) => {
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

app.post('/api/admin/users', adminRequired, async (req, res) => {
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

app.put('/api/admin/users/:id', adminRequired, async (req, res) => {
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  dbReady
    .then(() => {
      httpServer.listen(PORT, () => {
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
module.exports.httpServer = httpServer;
module.exports.io = io;
