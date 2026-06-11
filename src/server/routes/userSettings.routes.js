const express = require('express');

const logger = require('../logger');
const { createUserSettingsService } = require('../services/userSettings.service');

const createUserSettingsRouter = ({
  authRequired,
  allAsync,
  cache = null,
  getAsync,
  runAsync,
}) => {
  const router = express.Router();
  const settings = createUserSettingsService({ allAsync, getAsync, runAsync });

  router.use('/settings', authRequired);

  router.get('/settings', async (req, res) => {
    try {
      const payload = await settings.getSettingsForUser(req.session.userId);
      res.json({ settings: payload });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load user settings');
      res.status(500).json({ error: 'Failed to load settings' });
    }
  });

  router.put('/settings', async (req, res) => {
    try {
      const result = await settings.updateSettingsForUser(req.session.userId, req.body);
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      await cache?.clearUserCache?.(req.session.userId);
      res.json({ settings: result.value });
    } catch (error) {
      logger.error({ err: error }, 'Failed to save user settings');
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  return router;
};

module.exports = createUserSettingsRouter;
