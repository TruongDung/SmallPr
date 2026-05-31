const express = require('express');

const { DEFAULT_DAILY_QUOTE, fetchDailyQuote } = require('../services/dailyQuote.service');

const createDailyQuoteRouter = () => {
  const router = express.Router();

  router.get('/daily-quote', async (req, res) => {
    try {
      const quote = await fetchDailyQuote();
      res.json({ quote });
    } catch (error) {
      console.error(error);
      res.json({ quote: DEFAULT_DAILY_QUOTE });
    }
  });

  return router;
};

module.exports = createDailyQuoteRouter;
