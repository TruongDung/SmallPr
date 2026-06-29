const nodemailer = require('nodemailer');

const logger = require('../../logger');
const { TASK_ALERT_TO } = require('../../config/env');
const { normalizeEmail } = require('../../utils/users');
const { stripHtml } = require('../../utils/tasks');

const EMAIL_TRANSLATIONS = {
  en: {
    taskManager: 'Task Manager',
    newTaskSubject: 'New task added',
    newTaskMessage: 'A new task was added by {username}.',
    summarySubject: 'Task summary',
    summaryMessage: 'Task summary requested by {username}.',
    noteSummarySubject: 'Notes summary',
    noteSummaryMessage: 'Notes summary requested by {username}.',
    noteTitle: 'Title',
    noteBody: 'Content',
    noteCreated: 'Created',
    noteUpdated: 'Updated',
    noNotes: 'No notes found.',
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
    noteSummarySubject: 'Tóm tắt ghi chú',
    noteSummaryMessage: 'Tóm tắt ghi chú được yêu cầu bởi {username}.',
    noteTitle: 'Tiêu đề',
    noteBody: 'Nội dung',
    noteCreated: 'Đã tạo',
    noteUpdated: 'Đã cập nhật',
    noNotes: 'Không có ghi chú nào.',
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

const tEmail = (language, key, values = {}) => {
  const dictionary = EMAIL_TRANSLATIONS[normalizeLanguage(language)];
  const template = dictionary[key] || EMAIL_TRANSLATIONS.en[key] || key;
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), template);
};

const formatTaskStatus = (status = 'todo', language = 'en') => tEmail(language, status);

const formatTaskPriority = (priority = 'medium', language = 'en') => tEmail(language, priority);

const createMailTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  const port = Number(SMTP_PORT) || 587;
  const secure = SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    requireTLS: !secure,
    tls: { minVersion: 'TLSv1.2' },
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 7000,
    greetingTimeout: 5000,
    socketTimeout: 7000,
  });
};

const getUserEmailRecipient = (user) => normalizeEmail(user?.email) || TASK_ALERT_TO;

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeLineBreaks = (value = '') =>
  String(value)
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .replace(/\r\n|\r|\n/g, '\n');

const formatPlainTextValue = (value = '') => normalizeLineBreaks(stripHtml(value));

const formatMultilineHtml = (value = '') =>
  normalizeLineBreaks(value)
    .split('\n')
    .map((line) => escapeHtml(line))
    .join('<br>');

const formatLinkedMultilineHtml = (value = '') =>
  formatMultilineHtml(value).replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
  );

const decodeBasicHtmlEntities = (value = '') =>
  String(value)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const linkifyEscapedHtml = (value = '') =>
  String(value).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

const formatEmailTextNodeHtml = (value = '') =>
  linkifyEscapedHtml(
    normalizeLineBreaks(decodeBasicHtmlEntities(value))
      .split('\n')
      .map((line) => escapeHtml(line))
      .join('<br>'),
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
    logger.warn('Task alert email skipped: SMTP_HOST, SMTP_USER, and SMTP_PASS are required.');
    return false;
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const to = getUserEmailRecipient(user);
  if (!to) {
    logger.warn('Task alert email skipped: user email or TASK_ALERT_TO is required.');
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
  const comment = formatPlainTextValue(task.comment);
  const commentHtml = formatRichTextEmailHtml(task.comment, '');
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
    hasComment ? `${tEmail(language, 'comment')}: ${comment}` : null,
    hasAttachment ? `${tEmail(language, 'attachment')}: ${task.attachment_name}` : null,
    hasReminder ? `${tEmail(language, 'dateTimeAlert')}: ${reminder}` : null,
  ].filter(Boolean);
  const optionalHtmlRows = [
    hasTag
      ? `<p style="margin:0 0 8px;"><strong>${escapeHtml(tEmail(language, 'tag'))}:</strong> ${escapeHtml(task.tag)}</p>`
      : '',
    `<p style="margin:0 0 8px;"><strong>${escapeHtml(tEmail(language, 'priority'))}:</strong> ${escapeHtml(priority)}</p>`,
    `<p style="margin:0 0 8px;"><strong>${escapeHtml(tEmail(language, 'status'))}:</strong> ${escapeHtml(status)}</p>`,
    hasDescription
      ? `
        <div style="margin:0 0 8px;">
          <strong>${escapeHtml(tEmail(language, 'description'))}:</strong>
          <div style="margin-top:4px;white-space:normal;">${descriptionHtml}</div>
        </div>
      `
      : '',
    hasComment
      ? `
        <div style="margin:0 0 8px;">
          <strong>${escapeHtml(tEmail(language, 'comment'))}:</strong>
          <div style="margin-top:4px;white-space:normal;">${commentHtml}</div>
        </div>
      `
      : '',
    hasAttachment
      ? `<p style="margin:0 0 8px;"><strong>${escapeHtml(tEmail(language, 'attachment'))}:</strong> ${escapeHtml(task.attachment_name)}</p>`
      : '',
    hasReminder
      ? `<p style="margin:0;"><strong>${escapeHtml(tEmail(language, 'dateTimeAlert'))}:</strong> ${escapeHtml(reminder)}</p>`
      : '',
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
    logger.warn('Task summary email skipped: SMTP_HOST, SMTP_USER, and SMTP_PASS are required.');
    return false;
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const to = getUserEmailRecipient(user);
  if (!to) {
    logger.warn('Task summary email skipped: user email or TASK_ALERT_TO is required.');
    return false;
  }

  const locale = normalizeLanguage(language) === 'vi' ? 'vi-VN' : 'en-US';
  const taskAlertMarker = tEmail(language, 'taskManager');
  const formatReminder = (task) =>
    task.reminder_at
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
    comment: formatPlainTextValue(task.comment) || tEmail(language, 'noComment'),
    commentHtml: formatRichTextEmailHtml(task.comment, tEmail(language, 'noComment')),
    attachment: task.attachment_name || tEmail(language, 'noAttachment'),
    reminder: formatReminder(task),
  }));
  const textTable = taskTableRows.length
    ? [
        headings.join('\t'),
        ...taskTableRows.map((task) =>
          [
            task.number,
            task.title,
            task.tag,
            task.priority,
            task.status,
            task.description,
            task.comment,
            task.attachment,
            task.reminder,
          ].join('\t'),
        ),
      ]
    : [tEmail(language, 'noTasks')];
  const htmlTable = taskTableRows.length
    ? `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
        <thead>
          <tr>
            ${headings
              .map(
                (heading) =>
                  `<th style="border:1px solid #d1d5db;padding:8px;background:#f3f4f6;text-align:left;">${escapeHtml(heading)}</th>`,
              )
              .join('')}
          </tr>
        </thead>
        <tbody>
          ${taskTableRows
            .map(
              (task) =>
                `<tr>
              <td style="border:1px solid #d1d5db;padding:8px;">${task.number}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.title)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.tag)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.priority)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.status)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;white-space:pre-line;">${task.descriptionHtml}</td>
              <td style="border:1px solid #d1d5db;padding:8px;white-space:pre-line;">${task.commentHtml}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.attachment)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(task.reminder)}</td>
            </tr>`,
            )
            .join('')}
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
    text: [taskAlertMarker, '', tEmail(language, 'summaryMessage', { username: user.username }), '', ...textTable].join(
      '\n',
    ),
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

const sendNoteSummaryEmail = async (notes, user, language = 'en') => {
  const transporter = createMailTransporter();
  if (!transporter) {
    logger.warn('Note summary email skipped: SMTP_HOST, SMTP_USER, and SMTP_PASS are required.');
    return false;
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const to = getUserEmailRecipient(user);
  if (!to) {
    logger.warn('Note summary email skipped: user email or TASK_ALERT_TO is required.');
    return false;
  }

  const locale = normalizeLanguage(language) === 'vi' ? 'vi-VN' : 'en-US';
  const appMarker = tEmail(language, 'taskManager');

  const formatDate = (dateStr) => {
    if (!dateStr) return tEmail(language, 'notSet');
    return new Date(dateStr).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const headings = [
    tEmail(language, 'number'),
    tEmail(language, 'noteTitle'),
    tEmail(language, 'noteBody'),
    tEmail(language, 'noteCreated'),
    tEmail(language, 'noteUpdated'),
  ];

  const noteRows = notes.map((note, index) => ({
    number: index + 1,
    title: note.title || '(Untitled)',
    body: formatPlainTextValue(note.body) || '',
    bodyHtml: formatRichTextEmailHtml(note.body, ''),
    created: formatDate(note.created_at),
    updated: formatDate(note.updated_at),
  }));

  const textTable = noteRows.length
    ? [
        headings.join('\t'),
        ...noteRows.map((note) =>
          [
            note.number,
            note.title,
            note.body.slice(0, 200) + (note.body.length > 200 ? '...' : ''),
            note.created,
            note.updated,
          ].join('\t'),
        ),
      ]
    : [tEmail(language, 'noNotes')];

  const htmlTable = noteRows.length
    ? `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
        <thead>
          <tr>
            ${headings
              .map(
                (heading) =>
                  `<th style="border:1px solid #d1d5db;padding:8px;background:#f3f4f6;text-align:left;">${escapeHtml(heading)}</th>`,
              )
              .join('')}
          </tr>
        </thead>
        <tbody>
          ${noteRows
            .map(
              (note) =>
                `<tr>
              <td style="border:1px solid #d1d5db;padding:8px;vertical-align:top;">${note.number}</td>
              <td style="border:1px solid #d1d5db;padding:8px;vertical-align:top;font-weight:600;">${escapeHtml(note.title)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;white-space:pre-line;vertical-align:top;">${note.bodyHtml}</td>
              <td style="border:1px solid #d1d5db;padding:8px;vertical-align:top;white-space:nowrap;">${escapeHtml(note.created)}</td>
              <td style="border:1px solid #d1d5db;padding:8px;vertical-align:top;white-space:nowrap;">${escapeHtml(note.updated)}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>`
    : `<p>${escapeHtml(tEmail(language, 'noNotes'))}</p>`;

  await transporter.sendMail({
    from,
    to,
    subject: tEmail(language, 'noteSummarySubject'),
    headers: {
      'X-Task-Manager-Alert': appMarker,
    },
    text: [appMarker, '', tEmail(language, 'noteSummaryMessage', { username: user.username }), '', ...textTable].join(
      '\n',
    ),
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;">
        <p><strong>${escapeHtml(appMarker)}</strong></p>
        <p>${escapeHtml(tEmail(language, 'noteSummaryMessage', { username: user.username }))}</p>
        ${htmlTable}
      </div>
    `,
  });

  return true;
};

const sendVerificationEmail = async ({ email, username, verificationUrl }) => {
  const transporter = createMailTransporter();
  if (!transporter) {
    logger.warn('Verification email skipped: SMTP_HOST, SMTP_USER, and SMTP_PASS are required.');
    return false;
  }

  const to = normalizeEmail(email);
  if (!to) {
    logger.warn('Verification email skipped: user email is required.');
    return false;
  }

  const appName = EMAIL_TRANSLATIONS.en.taskManager;
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `Verify your ${appName} account`,
    text: [
      `Hi ${username},`,
      '',
      `Please verify your ${appName} account before logging in:`,
      verificationUrl,
      '',
      'This link expires in 24 hours.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827;">
        <p>Hi ${escapeHtml(username)},</p>
        <p>Please verify your ${escapeHtml(appName)} account before logging in.</p>
        <p><a href="${escapeHtml(verificationUrl)}" target="_blank" rel="noopener noreferrer">Verify email</a></p>
        <p style="color:#4b5563;">This link expires in 24 hours.</p>
      </div>
    `,
  });

  return true;
};

module.exports = {
  sendVerificationEmail,
  sendTaskAlertEmail,
  sendTaskSummaryEmail,
  sendNoteSummaryEmail,
};
