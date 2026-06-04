const express = require('express');

const logger = require('../logger');
const { createAuditContext } = require('../services/auditLog.service');
const { createTransactionsService } = require('../services/transactions.service');
const { createStatementImportService } = require('../services/statementImport.service');
const { emitToUser } = require('../realtime');
const { validateRequest } = require('../middleware/validateRequest');
const {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
  mergeTransactionValues,
} = require('../schemas/transaction.schema');

const createTransactionsRouter = ({ authRequired, auditLogs, allAsync, getAsync, runAsync }) => {
  const router = express.Router();
  const transactions = createTransactionsService({ allAsync, getAsync, runAsync });
  const statementImport = createStatementImportService();

  router.use(authRequired);

  router.get('/', validateRequest(transactionQuerySchema, 'query'), async (req, res) => {
    try {
      const list = await transactions.listForUser(req.session.userId, req.validated);
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
        return res.status(422).json({ error: result.error });
      }
      res.json({ items: result.items });
    } catch (error) {
      logger.error({ err: error }, 'Failed to import statement');
      res.status(500).json({ error: 'Failed to import statement' });
    }
  });

  router.post('/', validateRequest(createTransactionSchema), async (req, res) => {
    try {
      const transaction = await transactions.create({
        userId: req.session.userId,
        ...req.validated,
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

      const validation = updateTransactionSchema.safeParse(req.body);
      if (!validation.success) {
        const [firstIssue] = validation.error.issues;
        return res.status(400).json({ error: firstIssue ? firstIssue.message : 'Invalid request' });
      }

      const updated = await transactions.update({
        id,
        userId: req.session.userId,
        ...mergeTransactionValues(transaction, validation.data),
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
