const express = require('express');

const logger = require('../logger');
const { createAuditContext } = require('../services/auditLog.service');
const {
  TRANSACTION_KINDS,
  MAX_TRANSACTION_CATEGORY_LENGTH,
  MAX_TRANSACTION_ACCOUNT_LENGTH,
  MAX_TRANSACTION_NOTE_LENGTH,
} = require('../constants/transactions');
const { createTransactionsService } = require('../services/transactions.service');
const { createStatementImportService } = require('../services/statementImport.service');
const { emitToUser } = require('../realtime');

const normalizeText = (value) => String(value || '').trim();

const normalizeAmount = (amount) => {
  if (amount === undefined || amount === null || amount === '') {
    return null;
  }

  const normalized = Number(amount);
  if (!Number.isFinite(normalized) || normalized <= 0 || normalized > 9999999999.99) {
    return null;
  }

  return Math.round(normalized * 100) / 100;
};

const normalizeDate = (date) => {
  const normalized = normalizeText(date);
  if (!normalized) return null;

  // Validate YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  return normalized;
};

const validateTransactionDetails = ({ occurred_on, kind, amount, category, account, note, credit_card_id }, existingTransaction = {}) => {
  const normalizedDate = occurred_on === undefined ? existingTransaction.occurred_on : normalizeDate(occurred_on);
  if (!normalizedDate) {
    return { error: 'Date is required and must be in YYYY-MM-DD format' };
  }

  const normalizedKind = kind === undefined ? existingTransaction.kind : normalizeText(kind);
  if (!TRANSACTION_KINDS.includes(normalizedKind)) {
    return { error: 'Kind must be income or expense' };
  }

  const normalizedAmount = amount === undefined ? Number(existingTransaction.amount) : normalizeAmount(amount);
  if (normalizedAmount === null) {
    return { error: 'Amount must be a valid positive number' };
  }

  const normalizedCategory = category === undefined ? normalizeText(existingTransaction.category) : normalizeText(category);
  if (normalizedCategory.length > MAX_TRANSACTION_CATEGORY_LENGTH) {
    return { error: `Category must be ${MAX_TRANSACTION_CATEGORY_LENGTH} characters or less` };
  }

  const normalizedAccount = account === undefined ? normalizeText(existingTransaction.account) : normalizeText(account);
  if (normalizedAccount.length > MAX_TRANSACTION_ACCOUNT_LENGTH) {
    return { error: `Account must be ${MAX_TRANSACTION_ACCOUNT_LENGTH} characters or less` };
  }

  const normalizedNote = note === undefined ? normalizeText(existingTransaction.note) : normalizeText(note);
  if (normalizedNote.length > MAX_TRANSACTION_NOTE_LENGTH) {
    return { error: `Note must be ${MAX_TRANSACTION_NOTE_LENGTH} characters or less` };
  }

  const normalizedCreditCardId = credit_card_id === undefined
    ? (existingTransaction.credit_card_id || null)
    : (credit_card_id ? Number(credit_card_id) : null);

  return {
    values: {
      occurredOn: normalizedDate,
      kind: normalizedKind,
      amount: normalizedAmount,
      category: normalizedCategory,
      account: normalizedAccount,
      note: normalizedNote,
      creditCardId: normalizedCreditCardId,
    },
  };
};

const createTransactionsRouter = ({ authRequired, auditLogs, allAsync, getAsync, runAsync, anthropicApiKey }) => {
  const router = express.Router();
  const transactions = createTransactionsService({ allAsync, getAsync, runAsync });
  const statementImport = createStatementImportService({ apiKey: anthropicApiKey });

  router.use(authRequired);

  router.get('/', async (req, res) => {
    try {
      const { month, year, kind, category } = req.query;
      const filters = {};

      if (month) {
        const m = Number(month);
        if (!Number.isFinite(m) || m < 1 || m > 12) {
          return res.status(400).json({ error: 'Month must be a number between 1 and 12' });
        }
        filters.month = m;
      }
      if (year) {
        const y = Number(year);
        if (!Number.isFinite(y) || y < 2000 || y > 2100) {
          return res.status(400).json({ error: 'Year must be a number between 2000 and 2100' });
        }
        filters.year = y;
      }
      if (kind) {
        if (!TRANSACTION_KINDS.includes(kind)) {
          return res.status(400).json({ error: 'Kind must be income or expense' });
        }
        filters.kind = kind;
      }
      if (category) filters.category = String(category).trim().slice(0, MAX_TRANSACTION_CATEGORY_LENGTH);

      const list = await transactions.listForUser(req.session.userId, filters);
      res.json({ transactions: list });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load transactions');
      res.status(500).json({ error: 'Failed to load transactions' });
    }
  });

  router.get('/summary', async (req, res) => {
    try {
      const { month, year } = req.query;
      const summary = await transactions.getSummary(
        req.session.userId,
        month ? Number(month) : null,
        year ? Number(year) : null
      );
      res.json({ summary });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load summary');
      res.status(500).json({ error: 'Failed to load summary' });
    }
  });

  router.get('/categories', async (req, res) => {
    try {
      const categories = await transactions.getCategoriesForUser(req.session.userId);
      res.json({ categories: categories.map(c => c.category) });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load categories');
      res.status(500).json({ error: 'Failed to load categories' });
    }
  });

  // Parse an uploaded credit-card statement PDF into purchase line items and
  // return them for review. Nothing is saved here — the client previews the
  // rows and re-submits the confirmed ones through POST / (reusing validation).
  // A route-scoped body parser allows a larger payload than the global 8mb
  // limit since the PDF arrives base64-encoded in JSON.
  router.post('/import-statement', express.json({ limit: '20mb' }), async (req, res) => {
    const base64Pdf = String(req.body?.pdf || '');
    if (!base64Pdf) {
      return res.status(400).json({ error: 'No PDF provided.' });
    }

    try {
      const result = await statementImport.parseStatement({ base64Pdf });
      if (result.error) {
        const status = statementImport.isConfigured() ? 422 : 503;
        return res.status(status).json({ error: result.error });
      }
      res.json({ items: result.items });
    } catch (error) {
      logger.error({ err: error }, 'Failed to import statement');
      res.status(500).json({ error: 'Failed to import statement' });
    }
  });

  router.post('/', async (req, res) => {
    const validation = validateTransactionDetails(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const transaction = await transactions.create({
        userId: req.session.userId,
        ...validation.values,
      });
      await auditLogs.record({
        ...createAuditContext(req),
        action: 'create',
        entityType: 'transaction',
        entityId: transaction.id,
        summary: `${transaction.kind} ${transaction.amount} ${transaction.category || ''}`.trim(),
        after: transaction,
      });
      emitToUser(req.session.userId, 'transaction:created', { transaction });
      res.json({ transaction });
    } catch (error) {
      logger.error({ err: error }, 'Failed to create transaction');
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  });

  router.put('/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const transaction = await transactions.findForUser(id, req.session.userId);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      const validation = validateTransactionDetails(req.body, transaction);
      if (validation.error) {
        return res.status(400).json({ error: validation.error });
      }

      const updated = await transactions.update({
        id,
        userId: req.session.userId,
        ...validation.values,
      });
      await auditLogs.record({
        ...createAuditContext(req),
        action: 'edit',
        entityType: 'transaction',
        entityId: updated.id,
        summary: `${updated.kind} ${updated.amount} ${updated.category || ''}`.trim(),
        before: transaction,
        after: updated,
      });
      emitToUser(req.session.userId, 'transaction:updated', { transaction: updated });
      res.json({ transaction: updated });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update transaction');
      res.status(500).json({ error: 'Failed to update transaction' });
    }
  });

  router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const transaction = await transactions.findForUser(id, req.session.userId);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      await transactions.remove({ id, userId: req.session.userId });
      await auditLogs.record({
        ...createAuditContext(req),
        action: 'delete',
        entityType: 'transaction',
        entityId: transaction.id,
        summary: `${transaction.kind} ${transaction.amount} ${transaction.category || ''}`.trim(),
        before: transaction,
      });
      emitToUser(req.session.userId, 'transaction:deleted', { id: Number(id) });
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete transaction');
      res.status(500).json({ error: 'Failed to delete transaction' });
    }
  });

  return router;
};

module.exports = createTransactionsRouter;
