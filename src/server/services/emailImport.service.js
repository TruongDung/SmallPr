const { MAX_TASK_TEXT_LENGTH, MAX_TASK_TITLE_LENGTH } = require('../constants/tasks');
const { stripHtml } = require('../utils/tasks');

// --- Charset helpers ------------------------------------------------------

// Map common email charset labels to Node Buffer encodings. Anything we don't
// explicitly recognise falls back to utf8, which is the safe modern default.
const normalizeCharset = (charset = 'utf-8') => {
  const normalized = String(charset).toLowerCase().trim();
  if (normalized === 'utf-8' || normalized === 'utf8') return 'utf8';
  if (normalized === 'us-ascii' || normalized === 'ascii') return 'ascii';
  if (
    normalized === 'iso-8859-1' ||
    normalized === 'latin1' ||
    normalized === 'windows-1252' ||
    normalized === 'cp1252'
  ) {
    return 'latin1';
  }
  return 'utf8';
};

// --- Transfer-encoding decoders -------------------------------------------

// Decode a quoted-printable string into text. Handles soft line breaks (an
// "=" at the end of a line) and "=XX" hex escapes, interpreting the resulting
// bytes with the declared charset.
const decodeQuotedPrintable = (input, charset = 'utf-8') => {
  const withoutSoftBreaks = String(input).replace(/=\r?\n/g, '');
  const bytes = [];
  for (let i = 0; i < withoutSoftBreaks.length; i += 1) {
    const char = withoutSoftBreaks[i];
    if (char === '=' && i + 2 < withoutSoftBreaks.length) {
      const hex = withoutSoftBreaks.substr(i + 1, 2);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    bytes.push(char.charCodeAt(0) & 0xff);
  }
  return Buffer.from(bytes).toString(normalizeCharset(charset));
};

const decodeBase64 = (input, charset = 'utf-8') =>
  Buffer.from(String(input).replace(/\s+/g, ''), 'base64').toString(normalizeCharset(charset));

// Decode RFC 2047 "encoded-words" used in headers, e.g.
// "=?UTF-8?B?SGVsbG8=?=" or "=?UTF-8?Q?Hello=20World?=".
const decodeEncodedWords = (value = '') =>
  String(value).replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_match, charset, encoding, text) => {
    if (encoding.toUpperCase() === 'B') {
      return decodeBase64(text, charset);
    }
    // Q-encoding is quoted-printable with "_" standing in for a space.
    return decodeQuotedPrintable(text.replace(/_/g, ' '), charset);
  });

// --- MIME parsing ---------------------------------------------------------

// Split a raw message (or MIME part) into its header block and body at the
// first blank line. Line endings are normalised to "\n" beforehand.
const splitHeadersAndBody = (raw) => {
  const normalized = String(raw).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const separatorIndex = normalized.indexOf('\n\n');
  if (separatorIndex === -1) {
    return { headerText: normalized, body: '' };
  }
  return {
    headerText: normalized.slice(0, separatorIndex),
    body: normalized.slice(separatorIndex + 2),
  };
};

// Parse a header block into a lowercase-keyed map, unfolding multi-line
// (continuation) header values along the way.
const parseHeaders = (headerText) => {
  const headers = {};
  let currentKey = null;
  for (const line of String(headerText).split('\n')) {
    if (/^[ \t]/.test(line) && currentKey) {
      headers[currentKey] += ` ${line.trim()}`;
      continue;
    }
    const match = line.match(/^([^:]+):\s?(.*)$/);
    if (match) {
      currentKey = match[1].toLowerCase().trim();
      headers[currentKey] = match[2];
    }
  }
  return headers;
};

// Parse a Content-Type (or similar) header into its type plus parameters.
const parseContentType = (value = 'text/plain') => {
  const [rawType, ...rawParams] = String(value).split(';');
  const result = { type: (rawType || '').toLowerCase().trim(), params: {} };
  for (const param of rawParams) {
    const match = param.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].toLowerCase().trim();
      result.params[key] = match[2].trim().replace(/^"(.*)"$/, '$1');
    }
  }
  return result;
};

// Split a multipart body into its constituent parts using the boundary.
const splitMultipart = (body, boundary) => {
  const delimiter = `--${boundary}`;
  const segments = String(body).split(delimiter);
  const parts = [];
  // segments[0] is the preamble; a segment starting with "--" is the closing
  // boundary, after which nothing relevant follows.
  for (let i = 1; i < segments.length; i += 1) {
    const segment = segments[i];
    if (segment.startsWith('--')) break;
    parts.push(segment.replace(/^\r?\n/, ''));
  }
  return parts;
};

// Decode a leaf part's body according to its transfer encoding and charset.
const decodePartBody = (body, headers, contentType) => {
  const encoding = String(headers['content-transfer-encoding'] || '')
    .toLowerCase()
    .trim();
  const charset = contentType.params.charset || 'utf-8';
  if (encoding === 'base64') return decodeBase64(body, charset);
  if (encoding === 'quoted-printable') return decodeQuotedPrintable(body, charset);
  return String(body);
};

// Walk a message/part tree and return the best plain-text body we can find.
// Preference order: text/plain > text/html (converted to text) > first nested
// multipart result.
const extractBody = (body, headers) => {
  const contentType = parseContentType(headers['content-type'] || 'text/plain');

  if (contentType.type.startsWith('multipart/')) {
    const boundary = contentType.params.boundary;
    if (!boundary) return '';

    let plain = null;
    let html = null;
    let nested = null;

    for (const part of splitMultipart(body, boundary)) {
      const { headerText, body: partBody } = splitHeadersAndBody(part);
      const partHeaders = parseHeaders(headerText);
      const partContentType = parseContentType(partHeaders['content-type'] || 'text/plain');

      if (partContentType.type.startsWith('multipart/')) {
        const nestedResult = extractBody(partBody, partHeaders);
        if (nestedResult && nested === null) nested = nestedResult;
      } else if (partContentType.type === 'text/plain' && plain === null) {
        plain = decodePartBody(partBody, partHeaders, partContentType).trim();
      } else if (partContentType.type === 'text/html' && html === null) {
        html = decodePartBody(partBody, partHeaders, partContentType);
      }
    }

    if (plain) return plain;
    if (html) return stripHtml(html);
    if (nested) return nested;
    return '';
  }

  const decoded = decodePartBody(body, headers, contentType);
  if (contentType.type === 'text/html') return stripHtml(decoded);
  return decoded.trim();
};

// --- Due-date extraction --------------------------------------------------

const MONTHS = {
  january: '01',
  jan: '01',
  february: '02',
  feb: '02',
  march: '03',
  mar: '03',
  april: '04',
  apr: '04',
  may: '05',
  june: '06',
  jun: '06',
  july: '07',
  jul: '07',
  august: '08',
  aug: '08',
  september: '09',
  sep: '09',
  sept: '09',
  october: '10',
  oct: '10',
  november: '11',
  nov: '11',
  december: '12',
  dec: '12',
};

// Words that hint a nearby date is the relevant travel/deadline date. The
// extractor prefers dates closest to one of these. Kept travel/deadline
// specific (with word boundaries) so generic prose like "dated" doesn't match.
const DATE_KEYWORD_RE =
  /\b(travel(?:l?ing)?|depart(?:ure|ing)?|flight|trip|check[\s-]?in|check[\s-]?out|arriv(?:al|ing)|itinerary|boarding|booking|reservation|due|deadline)\b/gi;

// Build a validated YYYY-MM-DD string, rejecting impossible dates (e.g. Feb 30)
// by round-tripping through Date.
const buildYmd = (year, month, day) => {
  const y = String(year).padStart(4, '0');
  const mo = String(Number(month)).padStart(2, '0');
  const d = String(Number(day)).padStart(2, '0');
  if (Number(mo) < 1 || Number(mo) > 12) return null;
  if (Number(d) < 1 || Number(d) > 31) return null;
  const parsed = new Date(`${y}-${mo}-${d}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getUTCMonth() + 1 !== Number(mo) || parsed.getUTCDate() !== Number(d)) {
    return null;
  }
  return `${y}-${mo}-${d}`;
};

// Collect every date-looking token in the text along with its position, so the
// caller can rank them by proximity to a keyword.
const collectDateCandidates = (text) => {
  const candidates = [];
  const push = (date, index) => {
    if (date) candidates.push({ date, index });
  };
  let match;

  // ISO: 2024-03-15
  const isoRe = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;
  while ((match = isoRe.exec(text)) !== null) {
    push(buildYmd(match[1], match[2], match[3]), match.index);
  }

  // Numeric slash/dot: MM/DD/YYYY or MM/DD/YY (US-style, matching the
  // statement importer's convention).
  const slashRe = /\b(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})\b/g;
  while ((match = slashRe.exec(text)) !== null) {
    let year = match[3];
    if (year.length === 2) year = `20${year}`;
    push(buildYmd(year, match[1], match[2]), match.index);
  }

  // Month DD, YYYY  (e.g. "March 15, 2024" or "Mar 15 2024")
  const monthDayYearRe = /\b([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/g;
  while ((match = monthDayYearRe.exec(text)) !== null) {
    const month = MONTHS[match[1].toLowerCase()];
    push(month ? buildYmd(match[3], month, match[2]) : null, match.index);
  }

  // DD Month YYYY  (e.g. "15 March 2024" or "15th Mar, 2024")
  const dayMonthYearRe = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9}),?\s+(\d{4})\b/g;
  while ((match = dayMonthYearRe.exec(text)) !== null) {
    const month = MONTHS[match[2].toLowerCase()];
    push(month ? buildYmd(match[3], month, match[1]) : null, match.index);
  }

  return candidates;
};

// Pick the most likely due date from free text. Dates near a travel/deadline
// keyword win; otherwise the first date found is used. Returns YYYY-MM-DD or
// null when no date is present.
const extractDueDate = (text) => {
  const source = String(text || '');
  const candidates = collectDateCandidates(source);
  if (!candidates.length) return null;

  const keywordPositions = [];
  let keywordMatch;
  DATE_KEYWORD_RE.lastIndex = 0;
  while ((keywordMatch = DATE_KEYWORD_RE.exec(source)) !== null) {
    keywordPositions.push(keywordMatch.index);
  }

  if (!keywordPositions.length) {
    return candidates[0].date;
  }

  // Prefer a date that appears just after a keyword (the common
  // "Travel date: <date>" shape), choosing the smallest forward gap.
  let bestForward = null;
  let bestForwardDistance = Infinity;
  for (const candidate of candidates) {
    for (const position of keywordPositions) {
      if (position <= candidate.index) {
        const distance = candidate.index - position;
        if (distance < bestForwardDistance) {
          bestForwardDistance = distance;
          bestForward = candidate;
        }
      }
    }
  }
  if (bestForward) return bestForward.date;

  // Otherwise fall back to absolute proximity to any keyword.
  let best = candidates[0];
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    for (const position of keywordPositions) {
      const distance = Math.abs(candidate.index - position);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }
  }
  return best.date;
};

// --- Task draft assembly --------------------------------------------------

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Convert plain-text body lines into simple HTML paragraphs so the task
// description renders nicely in the rich-text view. Blank lines are dropped.
const bodyToHtmlParagraphs = (body) =>
  String(body)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');

// Build a task payload (title + description) from the parsed email fields.
// The title is the subject, truncated to the task title limit; the
// description carries the From/Date context plus the email body, truncated to
// the task text limit so it always passes validation.
const buildTaskDraft = ({ subject, from, date, body }) => {
  const cleanSubject = String(subject || '')
    .replace(/\s+/g, ' ')
    .trim();
  const title = (cleanSubject || 'Email task').slice(0, MAX_TASK_TITLE_LENGTH);

  const metaParts = [];
  if (from) metaParts.push(`<p><strong>From:</strong> ${escapeHtml(from)}</p>`);
  if (date) metaParts.push(`<p><strong>Date:</strong> ${escapeHtml(date)}</p>`);
  if (cleanSubject) metaParts.push(`<p><strong>Subject:</strong> ${escapeHtml(cleanSubject)}</p>`);

  const meta = metaParts.join('');
  const separator = meta ? '<hr>' : '';

  // Reserve room for the meta block so the whole description stays within the
  // text limit even for long emails. The limit is measured on stripped text.
  const metaPlainLength = stripHtml(meta).length;
  const bodyBudget = Math.max(0, MAX_TASK_TEXT_LENGTH - metaPlainLength - 8);
  const truncatedBody = String(body || '').slice(0, bodyBudget);
  const bodyHtml = bodyToHtmlParagraphs(truncatedBody);

  const description = `${meta}${separator}${bodyHtml}`.trim();

  // Pull a travel/deadline date out of the subject + body, if present, and use
  // it as the task due date. The email's own Date header is intentionally not
  // used here since that's when the message was sent, not the travel date.
  const dueDate = extractDueDate(`${cleanSubject}\n${body}`);

  return { title, description, due_date: dueDate || null };
};

// --- Public API -----------------------------------------------------------

// Decode a base64-encoded .eml file, parse its headers and body, and return a
// task draft ready to hand to validateCreateTask. Returns { error } on any
// failure so callers can surface a friendly message.
const parseEmailToTask = ({ base64Eml }) => {
  if (!base64Eml) {
    return { error: 'No email file provided.' };
  }

  // Tolerate a data-URL prefix in case the client forwards it verbatim.
  const commaIndex = String(base64Eml).indexOf(',');
  const payload =
    String(base64Eml).startsWith('data:') && commaIndex !== -1
      ? String(base64Eml).slice(commaIndex + 1)
      : String(base64Eml);

  let raw;
  try {
    raw = Buffer.from(payload, 'base64').toString('utf8');
  } catch (_error) {
    return { error: 'Invalid email file.' };
  }

  if (!raw || !raw.trim()) {
    return { error: 'The email file is empty.' };
  }

  const { headerText, body } = splitHeadersAndBody(raw);
  const headers = parseHeaders(headerText);

  // A valid .eml has at least a Subject, From, or Date header. If none are
  // present the file probably isn't an email at all.
  if (!headers.subject && !headers.from && !headers.date) {
    return { error: 'This file does not look like a valid email (.eml).' };
  }

  const subject = decodeEncodedWords(headers.subject || '');
  const from = decodeEncodedWords(headers.from || '');
  const date = decodeEncodedWords(headers.date || '');
  const textBody = extractBody(body, headers);

  const task = buildTaskDraft({ subject, from, date, body: textBody });
  return { task };
};

const createEmailImportService = () => ({
  parseEmailToTask,
});

module.exports = {
  createEmailImportService,
  parseEmailToTask,
  buildTaskDraft,
  decodeEncodedWords,
  decodeQuotedPrintable,
  decodeBase64,
  extractBody,
  extractDueDate,
  parseHeaders,
  splitHeadersAndBody,
};
