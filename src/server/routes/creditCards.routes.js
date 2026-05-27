const express = require('express');

const { MAX_CREDIT_CARD_NAME_LENGTH } = require('../constants/creditCards');
const { createCreditCardsService } = require('../services/creditCards.service');
const { normalizeClosingDate, normalizeCreditCardBalance } = require('../utils/creditCards');

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
    const { name, total_balance, closing_date } = req.body;
    const normalizedName = String(name || '').trim();

    if (!normalizedName) {
      return res.status(400).json({ error: 'Credit card No is required' });
    }

    if (normalizedName.length > MAX_CREDIT_CARD_NAME_LENGTH) {
      return res.status(400).json({ error: `Credit card No must be ${MAX_CREDIT_CARD_NAME_LENGTH} characters or less` });
    }

    const normalizedBalance = normalizeCreditCardBalance(total_balance);
    if (normalizedBalance === null) {
      return res.status(400).json({ error: 'Total balance must be a valid amount' });
    }

    const normalizedClosingDate = normalizeClosingDate(closing_date);
    if (normalizedClosingDate === null) {
      return res.status(400).json({ error: 'Closing date must be a valid date' });
    }

    try {
      const card = await creditCards.create({
        userId: req.session.userId,
        name: normalizedName,
        totalBalance: normalizedBalance,
        closingDate: normalizedClosingDate,
      });
      res.json({ card });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create credit card' });
    }
  });

  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, total_balance, closing_date } = req.body;

    try {
      const card = await creditCards.findForUser(id, req.session.userId);
      if (!card) {
        return res.status(404).json({ error: 'Credit card not found' });
      }

      const normalizedName = name === undefined ? card.name : String(name || '').trim();
      if (!normalizedName) {
        return res.status(400).json({ error: 'Credit card No is required' });
      }

      if (normalizedName.length > MAX_CREDIT_CARD_NAME_LENGTH) {
        return res.status(400).json({ error: `Credit card No must be ${MAX_CREDIT_CARD_NAME_LENGTH} characters or less` });
      }

      const normalizedBalance = total_balance === undefined ? Number(card.total_balance) : normalizeCreditCardBalance(total_balance);
      if (normalizedBalance === null) {
        return res.status(400).json({ error: 'Total balance must be a valid amount' });
      }

      const normalizedClosingDate = normalizeClosingDate(closing_date === undefined ? card.closing_date : closing_date);
      if (normalizedClosingDate === null) {
        return res.status(400).json({ error: 'Closing date must be a valid date' });
      }

      const updatedCard = await creditCards.update({
        id,
        userId: req.session.userId,
        name: normalizedName,
        totalBalance: normalizedBalance,
        closingDate: normalizedClosingDate,
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
