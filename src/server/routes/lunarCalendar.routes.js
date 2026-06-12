const express = require('express');

const logger = require('../logger');
const { createLunarCalendarService } = require('../services/lunarCalendar.service');

const parseMonthRequest = (query = {}) => {
  const year = Number(query.year);
  const month = Number(query.month);

  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return { error: 'Year must be between 1900 and 2100' };
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { error: 'Month must be between 1 and 12' };
  }

  return { value: { year, month } };
};

const createLunarCalendarRouter = ({
  authRequired,
  getUserById,
}) => {
  const router = express.Router();
  const lunarCalendar = createLunarCalendarService();

  router.use('/lunar-calendar', authRequired);

  router.get('/lunar-calendar/month', async (req, res) => {
    const parsed = parseMonthRequest(req.query);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    try {
      const user = typeof getUserById === 'function'
        ? await getUserById(req.session.userId)
        : null;
      const timezone = lunarCalendar.normalizeTimezone(user?.timezone);
      const days = lunarCalendar.getMonthLunarLabels({
        ...parsed.value,
        timezone,
      });
      res.json({ days });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load lunar calendar month');
      res.status(500).json({ error: 'Failed to load lunar calendar' });
    }
  });

  return router;
};

module.exports = createLunarCalendarRouter;
module.exports.parseMonthRequest = parseMonthRequest;
