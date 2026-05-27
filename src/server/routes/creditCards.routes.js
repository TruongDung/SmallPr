const express = require('express');

const {
  CREDIT_CARD_ISSUERS,
  MAX_CREDIT_CARD_NAME_LENGTH,
  MAX_CREDIT_CARD_USER_LENGTH,
} = require('../constants/creditCards');
const { createCreditCardsService } = require('../services/creditCards.service');
const {
  normalizeClosingDate,
  normalizeCreditCardBalance,
  normalizeCreditCardIssuer,
  normalizeCreditCardUser,
} = require('../utils/creditCards');

const validateCreditCardDetails = ({ name, card_user, issuer, total_balance, closing_date }, existingCard = {}) => {
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
      closingDate: normalizedClosingDate,
    },
  };
};

const createCreditCardsRouter = ({ authRequired, allAsync, getAsync, runAsync }) => {
  const router = express.Router();
  const creditCards = createCreditCardsService({ allAsync, getAsync, runAsync });

  router.use(authRequired);

  router.get('/', async (req, res) => {
    try {
      const cards = await creditCards.listForUser(req.session.userId);
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
      res.json({ card: updatedCard });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update credit card' });
    }
  });

  return router;
};

module.exports = createCreditCardsRouter;
