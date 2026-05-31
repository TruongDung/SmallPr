const express = require('express');

const {
  CREDIT_CARD_ISSUERS,
  FAST_ACCESS_BILL_STATUSES,
  MAX_CREDIT_CARD_NAME_LENGTH,
  MAX_FAST_ACCESS_BILL_TEXT_LENGTH,
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
    return { error: 'Total balance must be a valid amount' };
  }

  const normalizedInterestCharge = interest_charge === undefined
    ? Number(existingCard.interest_charge || 0)
    : normalizeCreditCardInterestCharge(interest_charge);
  if (normalizedInterestCharge === null) {
    return { error: 'Interest charge must be a valid amount' };
  }

  const normalizedClosingDate = normalizeClosingDate(
    closing_date === undefined ? existingCard.closing_date : closing_date
  );
  if (normalizedClosingDate === null) {
    return { error: 'Closing date must be a valid date' };
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

const createCreditCardsRouter = ({ authRequired, allAsync, getAsync, runAsync }) => {
  const router = express.Router();
  const creditCards = createCreditCardsService({ allAsync, getAsync, runAsync });

  router.use(authRequired);

  router.get('/fast-access-bills', async (req, res) => {
    try {
      await creditCards.seedFastAccessBillsForUser(req.session.userId);
      const bills = await creditCards.listFastAccessBillsForUser(req.session.userId);
      res.json({ bills });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to load fast access bills' });
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
      emitToUser(req.session.userId, 'bill:updated', { bill: updatedBill });
      res.json({ bill: updatedBill });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update fast access bill' });
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
      console.error(error);
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
      console.error(error);
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
      emitToUser(req.session.userId, 'card:updated', { id: card.id });
      res.json({ card });
    } catch (error) {
      console.error(error);
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
      emitToUser(req.session.userId, 'card:updated', { id: Number(id) });
      res.json({ card: updatedCard });
    } catch (error) {
      console.error(error);
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
      emitToUser(req.session.userId, 'card:updated', { id: Number(id) });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete credit card' });
    }
  });

  return router;
};

module.exports = createCreditCardsRouter;
