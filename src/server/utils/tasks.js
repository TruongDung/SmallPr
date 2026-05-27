const path = require('path');

const {
  MAX_ATTACHMENT_BYTES,
  VALID_PRIORITIES,
  VALID_STATUSES,
} = require('../constants/tasks');

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

const normalizeTag = (tag = '') => {
  return String(tag).trim();
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

module.exports = {
  normalizePriority,
  normalizeStatus,
  normalizeTag,
  parseAttachment,
  stripHtml,
};
