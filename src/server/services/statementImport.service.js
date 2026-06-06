const { getDocumentProxy, extractText } = require('unpdf');

const logger = require('../logger');

const {
  MAX_TRANSACTION_CATEGORY_LENGTH,
  MAX_TRANSACTION_NOTE_LENGTH,
} = require('../constants/transactions');

// --- Date normalisation ---------------------------------------------------

const isValidDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

const MONTH_NAMES = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Attempt to normalise a raw date token into YYYY-MM-DD.
 * Handles: MM/DD, MM/DD/YYYY, YYYY-MM-DD, Mon DD, Mon DD YYYY.
 * Returns null when the token doesn't look like a date.
 */
const normaliseDate = (raw, fallbackYear) => {
  const token = String(raw || '').trim();
  if (!token) return null;

  // YYYY-MM-DD
  let match = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  // MM/DD/YYYY or MM/DD
  match = token.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (match) {
    const m = String(Number(match[1])).padStart(2, '0');
    const d = String(Number(match[2])).padStart(2, '0');
    let y = match[3] ? String(match[3]) : String(fallbackYear || new Date().getFullYear());
    if (y.length === 2) y = `20${y}`;
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  // Mon DD or Mon DD YYYY (e.g. "Jan 15" or "Jan 15 2025")
  match = token.match(/^([A-Za-z]{3,})\s+(\d{1,2})(?:\s+(\d{2,4}))?$/);
  if (match) {
    const m = MONTH_NAMES[match[1].toLowerCase().slice(0, 3)];
    if (!m) return null;
    const d = String(Number(match[2])).padStart(2, '0');
    let y = match[3] ? String(match[3]) : String(fallbackYear || new Date().getFullYear());
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m}-${d}`;
  }

  return null;
};

// --- Amount normalisation -------------------------------------------------

/**
 * Parse a raw dollar-amount token into a positive number.
 * Handles: $1,234.56, -$500.00, 45.67, (1,234.56).
 * Returns NaN when the token doesn't look like an amount.
 */
const normaliseAmount = (raw) => {
  const token = String(raw || '').trim();
  if (!token) return NaN;

  // Parenthesised amounts are negative (accounting notation)
  const isParens = token.startsWith('(') && token.endsWith(')');
  const cleaned = isParens ? token.slice(1, -1) : token;

  // Strip currency symbols, commas, spaces
  const numeric = cleaned.replace(/[$€£¥\s,]/g, '');

  const value = Number(numeric);
  if (!Number.isFinite(value)) return NaN;

  return isParens ? Math.abs(value) : Math.abs(value);
};

// --- Transaction line extraction ------------------------------------------

// Regex to find a dollar amount at or near the end of a line.
// Captures: $1,234.56  -$500.00  45.67  (1,234.56)
const AMOUNT_RE = /(?:^|\s)(-?\$?\s*-?[\d][\d,]{0,10}\.\d{2}\s*$|\(\s*\$?[\d][\d,]{0,10}\.\d{2}\s*\)\s*$)/;

/**
 * Regex that matches a transaction line with:
 *   (date)  (description...)  (amount)
 *
 * Group 1: date token  (MM/DD, MM/DD/YYYY, YYYY-MM-DD, Mon DD)
 * Group 2: description (everything between date and amount)
 * Group 3: amount token
 */
const LINE_RE = new RegExp(
  '(?:^|\\n)\\s*' +                                        // start of line
  '(' +                                                     // date (group 1)
    '(?:\\d{4}-\\d{2}-\\d{2})|' +
    '(?:\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?)|' +
    '(?:[A-Z][a-z]{2,}\\s+\\d{1,2}(?:\\s*[,\\\']?\\s*\\d{2,4})?)' +
  ')' +
  '(?=\\s+|\\b)' +                                         // date must be followed by whitespace or word boundary
  '(.+?)' +                                                 // description (group 2) — lazy
  '(' +                                                      // amount (group 3)
    '(?:-?\\$?\\s*-?[\\d][\\d,]{0,10}\\.\\d{2})|' +
    '(?:\\(\\s*\\$?[\\d][\\d,]{0,10}\\.\\d{2}\\s*\\))' +
  ')' +
  '\\s*$',
  'gm'
);

// Exclude words that signal non-purchase lines
const SKIP_DESCRIPTIONS = /^(payments?|credits?|refunds?|returns?|balance transfers?|fees?|charges?|interest|rewards?|total|subtotal|amount due|minimum payment|payment due|new balance|previous balance|apr|annual fee|late fee|finance charge)/i;

const extractTransactions = (text, fallbackYear) => {
  const items = [];
  const seen = new Set(); // deduplicate exact matches

  let match;
  while ((match = LINE_RE.exec(text)) !== null) {
    const rawDate = match[1].trim();
    const rawDescription = match[2].trim();
    const rawAmount = match[3].trim();

    // Skip header/total lines that happen to match the pattern
    if (SKIP_DESCRIPTIONS.test(rawDescription)) continue;

    const date = normaliseDate(rawDate, fallbackYear);
    if (!date) continue;

    const amount = normaliseAmount(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    // Clean up description: collapse whitespace, remove stray characters
    const description = rawDescription
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E]/g, '') // strip non-printable characters
      .trim();

    if (!description || description.length < 2) continue;

    // Deduplicate on date + description + amount
    const key = `${date}|${description}|${amount}`;
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({ date, description, amount });
  }

  return items;
};

// --- Post-processing (reused from the original AI-based version) ----------

const normalizeItems = (rawItems) => (Array.isArray(rawItems) ? rawItems : [])
  .map((item) => {
    const amount = Number(item?.amount);
    if (!isValidDate(item?.date) || !Number.isFinite(amount) || amount <= 0) {
      return null;
    }
    const description = String(item?.description || '').trim();
    return {
      date: item.date,
      // The merchant is the natural category; full text goes to the note.
      category: description.slice(0, MAX_TRANSACTION_CATEGORY_LENGTH),
      note: description.slice(0, MAX_TRANSACTION_NOTE_LENGTH),
      amount: Math.round(amount * 100) / 100,
    };
  })
  .filter(Boolean);

// --- Public API -----------------------------------------------------------

const inferStatementYear = (text) => {
  const yearMatch = String(text).match(/(?:statement\s+period|statement\s+date|for\s+period|billing\s+cycle).*?(\d{4})/i)
    || String(text).match(/\b(20\d{2})\b/);
  return yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
};

const parseStatementText = (text) => {
  if (!text || String(text).trim().length === 0) {
    return { error: 'Could not read any text from this statement.' };
  }

  const fallbackYear = inferStatementYear(text);
  const rawItems = extractTransactions(String(text), fallbackYear);

  if (!rawItems.length) {
    return { error: 'No purchases were found in this statement.' };
  }

  const items = normalizeItems(rawItems);

  if (!items.length) {
    return { error: 'Could not read any transactions from this statement.' };
  }

  return { items };
};

const extractPdfText = async (base64Pdf) => {
  // Decode the base64 PDF into a buffer
  let buffer;
  try {
    buffer = Buffer.from(base64Pdf, 'base64');
  } catch (_error) {
    return { error: 'Invalid PDF data.' };
  }

  // Extract text from the PDF using unpdf (pdf.js under the hood)
  let text;
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    text = result.text;
  } catch (error) {
    logger.error({ err: error }, 'Failed to extract text from PDF');
    return { error: 'Failed to read the statement. Please try again or enter the items manually.' };
  } finally {
    if (pdf) {
      try { pdf.destroy(); } catch (_error) { /* ignore */ }
    }
  }

  return { text };
};

const createStatementImportService = () => {
  const parseStatementTextForEvaluation = async ({ text }) => parseStatementText(text);

  const parseStatement = async ({ base64Pdf }) => {
    if (!base64Pdf) {
      return { error: 'No PDF provided.' };
    }

    const extracted = await extractPdfText(base64Pdf);
    if (extracted.error) return extracted;

    return parseStatementText(extracted.text);
  };

  return {
    parseStatement,
    parseStatementTextForEvaluation,
  };
};

module.exports = {
  createStatementImportService,
  extractPdfText,
  extractTransactions,
  inferStatementYear,
  normalizeItems,
  parseStatementText,
};
