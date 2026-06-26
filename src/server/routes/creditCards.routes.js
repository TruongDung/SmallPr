const express = require('express');

const logger = require('../logger');
const { createAuditContext } = require('../services/auditLog.service');
const {
  CREDIT_CARD_ISSUERS,
  FAST_ACCESS_BILL_STATUSES,
  MAX_CREDIT_CARD_NAME_LENGTH,
  MAX_FAST_ACCESS_BILL_TEXT_LENGTH,
  MAX_FAST_ACCESS_LINK_LABEL_LENGTH,
  MAX_FAST_ACCESS_LINK_URL_LENGTH,
  MAX_CREDIT_CARD_USER_LENGTH,
} = require('../constants/creditCards');
const { createCreditCardsService } = require('../services/creditCards.service');
const { emitToUser } = require('../realtime');
const {
  normalizeClosingDate,
  normalizeCreditCardBalance,
  normalizeCreditCardInterestCharge,
  normalizeCreditCardIssuer,
  normalizeCreditCardUser,
} = require('../utils/creditCards');

const normalizeBillText = (value) => String(value || '').trim();
const normalizeLinkText = (value) => String(value || '').trim();

const validateFastAccessLinkDetails = ({ label, url }) => {
  const normalizedLabel = normalizeLinkText(label);
  if (!normalizedLabel) {
    return { error: 'Label is required' };
  }
  if (normalizedLabel.length > MAX_FAST_ACCESS_LINK_LABEL_LENGTH) {
    return { error: `Label must be ${MAX_FAST_ACCESS_LINK_LABEL_LENGTH} characters or less` };
  }

  const normalizedUrl = normalizeLinkText(url);
  if (!normalizedUrl) {
    return { error: 'URL is required' };
  }
  if (normalizedUrl.length > MAX_FAST_ACCESS_LINK_URL_LENGTH) {
    return { error: `URL must be ${MAX_FAST_ACCESS_LINK_URL_LENGTH} characters or less` };
  }
  try {
    const parsedUrl = new URL(normalizedUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { error: 'URL must start with http or https' };
    }
  } catch (error) {
    return { error: 'URL must be valid' };
  }

  return {
    values: {
      label: normalizedLabel,
      url: normalizedUrl,
    },
  };
};

const normalizeFastAccessBillAmount = (amount) => {
  if (amount === undefined || amount === null || amount === '') {
    return 0;
  }

  const normalized = Number(amount);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 9999999999.99) {
    return null;
  }

  return Math.round(normalized * 100) / 100;
};

const validateFastAccessBillDetails = ({ item, amount, due_date, pay_before, status }, existingBill = {}) => {
  const normalizedItem = item === undefined ? existingBill.item : normalizeBillText(item);
  if (!normalizedItem) {
    return { error: 'Item is required' };
  }

  if (normalizedItem.length > MAX_FAST_ACCESS_BILL_TEXT_LENGTH) {
    return { error: `Item must be ${MAX_FAST_ACCESS_BILL_TEXT_LENGTH} characters or less` };
  }

  const normalizedAmount = amount === undefined
    ? Number(existingBill.amount || 0)
    : normalizeFastAccessBillAmount(amount);
  if (normalizedAmount === null) {
    return { error: 'Amount must be a valid amount' };
  }

  const normalizedDueDate = due_date === undefined ? normalizeBillText(existingBill.due_date) : normalizeBillText(due_date);
  if (normalizedDueDate.length > MAX_FAST_ACCESS_BILL_TEXT_LENGTH) {
    return { error: `Due date must be ${MAX_FAST_ACCESS_BILL_TEXT_LENGTH} characters or less` };
  }

  const normalizedPayBefore = pay_before === undefined ? normalizeBillText(existingBill.pay_before) : normalizeBillText(pay_before);
  if (normalizedPayBefore.length > MAX_FAST_ACCESS_BILL_TEXT_LENGTH) {
    return { error: `Pay before must be ${MAX_FAST_ACCESS_BILL_TEXT_LENGTH} characters or less` };
  }

  const normalizedStatus = status === undefined ? existingBill.status : normalizeBillText(status);
  if (!FAST_ACCESS_BILL_STATUSES.includes(normalizedStatus)) {
    return { error: 'Status must be Paid or Unpaid' };
  }

  return {
    values: {
      item: normalizedItem,
      amount: normalizedAmount,
      dueDate: normalizedDueDate,
      payBefore: normalizedPayBefore,
      status: normalizedStatus,
    },
  };
};

const validateCreditCardDetails = ({ name, card_user, issuer, total_balance, interest_charge, closing_date }, existingCard = {}) => {
  const normalizedName = name === undefined ? existingCard.name : String(name || '').trim();
  if (!normalizedName) {
    return { error: 'Credit card No is required' };
  }

  if (normalizedName.length > MAX_CREDIT_CARD_NAME_LENGTH) {
    return { error: `Credit card No must be ${MAX_CREDIT_CARD_NAME_LENGTH} characters or less` };
  }

  const normalizedCardUser = card_user === undefined
    ? normalizeCreditCardUser(existingCard.card_user)
    : normalizeCreditCardUser(card_user);
  if (normalizedCardUser.length > MAX_CREDIT_CARD_USER_LENGTH) {
    return { error: `User must be ${MAX_CREDIT_CARD_USER_LENGTH} characters or less` };
  }

  const normalizedIssuer = normalizeCreditCardIssuer(
    issuer === undefined ? existingCard.issuer : issuer,
    CREDIT_CARD_ISSUERS
  );
  if (normalizedIssuer === null) {
    return { error: 'Card type must be one of the available options' };
  }

  const normalizedBalance = total_balance === undefined
    ? Number(existingCard.total_balance || 0)
    : normalizeCreditCardBalance(total_balance);
  if (normalizedBalance === null) {
    return { error: 'Balance must be a valid amount' };
  }

  const normalizedInterestCharge = interest_charge === undefined
    ? Number(existingCard.interest_charge || 0)
    : normalizeCreditCardInterestCharge(interest_charge);
  if (normalizedInterestCharge === null) {
    return { error: 'Interest must be a valid amount' };
  }

  const normalizedClosingDate = normalizeClosingDate(
    closing_date === undefined ? existingCard.closing_date : closing_date
  );
  if (normalizedClosingDate === null) {
    return { error: 'Close must be a valid date' };
  }

  return {
    values: {
      name: normalizedName,
      cardUser: normalizedCardUser,
      issuer: normalizedIssuer,
      totalBalance: normalizedBalance,
      interestCharge: normalizedInterestCharge,
      closingDate: normalizedClosingDate,
    },
  };
};

const createCreditCardsRouter = ({ authRequired, auditLogs, allAsync, getAsync, runAsync }) => {
  const router = express.Router();
  const creditCards = createCreditCardsService({ allAsync, getAsync, runAsync });

  router.use(authRequired);

  router.get('/fast-access-bills', async (req, res) => {
    try {
      const accountUser = await creditCards.getAccountUser(req.session.userId);
      if (accountUser?.username === 'admin') {
        await creditCards.seedFastAccessBillsForUser(req.session.userId);
      }
      const bills = await creditCards.listFastAccessBillsForUser(req.session.userId);
      res.json({ bills });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load fast access bills');
      res.status(500).json({ error: 'Failed to load fast access bills' });
    }
  });

  router.post('/fast-access-bills', async (req, res) => {
    const validation = validateFastAccessBillDetails(req.body, {});
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const bill = await creditCards.createFastAccessBill({
        userId: req.session.userId,
        ...validation.values,
      });
      await auditLogs.record({
        ...createAuditContext(req),
        action: 'create',
        entityType: 'expense',
        entityId: bill.id,
        summary: bill.item,
        after: bill,
      });
      emitToUser(req.session.userId, 'bill:created', { bill });
      res.json({ bill });
    } catch (error) {
      logger.error({ err: error }, 'Failed to create expense');
      res.status(500).json({ error: 'Failed to create expense' });
    }
  });

  router.get('/fast-access-links', async (req, res) => {
    try {
      const links = await creditCards.listFastAccessLinksForUser(req.session.userId);
      res.json({ links });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load bill payment websites');
      res.status(500).json({ error: 'Failed to load bill payment websites' });
    }
  });

  router.post('/fast-access-links', async (req, res) => {
    const validation = validateFastAccessLinkDetails(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const link = await creditCards.createFastAccessLink({
        userId: req.session.userId,
        ...validation.values,
      });
      res.json({ link });
    } catch (error) {
      logger.error({ err: error }, 'Failed to create bill payment website');
      res.status(500).json({ error: 'Failed to create bill payment website' });
    }
  });

  router.delete('/fast-access-links/:id', async (req, res) => {
    const { id } = req.params;
    const linkId = Number(id);
    if (!Number.isInteger(linkId) || linkId <= 0) {
      return res.status(400).json({ error: 'Invalid bill payment website' });
    }

    try {
      const link = await creditCards.findFastAccessLinkForUser(linkId, req.session.userId);
      if (!link) {
        return res.status(404).json({ error: 'Bill payment website not found' });
      }

      await creditCards.removeFastAccessLink({ id: linkId, userId: req.session.userId });
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete bill payment website');
      res.status(500).json({ error: 'Failed to delete bill payment website' });
    }
  });

  router.put('/fast-access-bills/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const bill = await creditCards.findFastAccessBillForUser(id, req.session.userId);
      if (!bill) {
        return res.status(404).json({ error: 'Fast access bill not found' });
      }

      const validation = validateFastAccessBillDetails(req.body, bill);
      if (validation.error) {
        return res.status(400).json({ error: validation.error });
      }

      const updatedBill = await creditCards.updateFastAccessBill({
        id,
        userId: req.session.userId,
        ...validation.values,
      });
      await auditLogs.record({
        ...createAuditContext(req),
        action: 'edit',
        entityType: 'expense',
        entityId: updatedBill.id,
        summary: updatedBill.item,
        before: bill,
        after: updatedBill,
      });
      emitToUser(req.session.userId, 'bill:updated', { bill: updatedBill });
      res.json({ bill: updatedBill });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update fast access bill');
      res.status(500).json({ error: 'Failed to update fast access bill' });
    }
  });

  router.delete('/fast-access-bills/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const bill = await creditCards.findFastAccessBillForUser(id, req.session.userId);
      if (!bill) {
        return res.status(404).json({ error: 'Fast access bill not found' });
      }

      await creditCards.removeFastAccessBill(id, req.session.userId);
      await auditLogs.record({
        ...createAuditContext(req),
        action: 'delete',
        entityType: 'expense',
        entityId: bill.id,
        summary: bill.item,
        before: bill,
      });
      emitToUser(req.session.userId, 'bill:deleted', { id: Number(id) });
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete fast access bill');
      res.status(500).json({ error: 'Failed to delete fast access bill' });
    }
  });

  router.get('/users', async (req, res) => {
    try {
      const [accountUser, savedUsers] = await Promise.all([
        creditCards.getAccountUser(req.session.userId),
        creditCards.listCardUsersForUser(req.session.userId),
      ]);
      const users = [
        ...new Set([
          accountUser && accountUser.username,
          ...savedUsers.map((user) => user.name),
        ].filter(Boolean)),
      ];
      res.json({ users });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load credit card users');
      res.status(500).json({ error: 'Failed to load credit card users' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const accountUser = await creditCards.getAccountUser(req.session.userId);
      const cards = accountUser?.username === 'admin'
        ? await creditCards.listForAdmin()
        : await creditCards.listForUser(req.session.userId);
      res.json({ cards });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load credit cards');
      res.status(500).json({ error: 'Failed to load credit cards' });
    }
  });

  router.post('/', async (req, res) => {
    const validation = validateCreditCardDetails(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const card = await creditCards.create({
        userId: req.session.userId,
        ...validation.values,
      });
      await auditLogs.record({
        ...createAuditContext(req),
        action: 'create',
        entityType: 'credit_card',
        entityId: card.id,
        summary: card.name,
        after: card,
      });
      emitToUser(req.session.userId, 'card:updated', { id: card.id });
      res.json({ card });
    } catch (error) {
      logger.error({ err: error }, 'Failed to create credit card');
      res.status(500).json({ error: 'Failed to create credit card' });
    }
  });

  router.put('/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const card = await creditCards.findForUser(id, req.session.userId);
      if (!card) {
        return res.status(404).json({ error: 'Credit card not found' });
      }

      const validation = validateCreditCardDetails(req.body, card);
      if (validation.error) {
        return res.status(400).json({ error: validation.error });
      }

      const updatedCard = await creditCards.update({
        id,
        userId: req.session.userId,
        ...validation.values,
      });
      await auditLogs.record({
        ...createAuditContext(req),
        action: 'edit',
        entityType: 'credit_card',
        entityId: updatedCard.id,
        summary: updatedCard.name,
        before: card,
        after: updatedCard,
      });
      emitToUser(req.session.userId, 'card:updated', { id: Number(id) });
      res.json({ card: updatedCard });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update credit card');
      res.status(500).json({ error: 'Failed to update credit card' });
    }
  });

  router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const card = await creditCards.findForUser(id, req.session.userId);
      if (!card) {
        return res.status(404).json({ error: 'Credit card not found' });
      }

      await creditCards.remove({ id, userId: req.session.userId });
      await auditLogs.record({
        ...createAuditContext(req),
        action: 'delete',
        entityType: 'credit_card',
        entityId: card.id,
        summary: card.name,
        before: card,
      });
      emitToUser(req.session.userId, 'card:updated', { id: Number(id) });
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete credit card');
      res.status(500).json({ error: 'Failed to delete credit card' });
    }
  });

  return router;
};

module.exports = createCreditCardsRouter;
