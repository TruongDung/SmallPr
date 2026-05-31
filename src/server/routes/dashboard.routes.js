const express = require('express');

const { createDashboardService } = require('../services/dashboard.service');

const KNOWN_CARD_IDS = [
  'todaysTasks',
  'taskStatusSummary',
  'bills',
  'creditCards',
  'recentNotes',
  'weather',
  'dailyQuote',
];

const DEFAULT_LANDING_VALUES = new Set(['today', 'last_used']);

const buildDefaultPreferences = () => ({
  version: 1,
  defaultLanding: 'today',
  cards: KNOWN_CARD_IDS.map((id, order) => ({ id, visible: true, order })),
});

// Read users.dashboard_preferences and merge stored values over the defaults
// so newly added cards appear automatically for existing users.
const mergeWithDefaults = (stored) => {
  const defaults = buildDefaultPreferences();
  if (!stored || typeof stored !== 'object') return defaults;

  const merged = {
    version: 1,
    defaultLanding: DEFAULT_LANDING_VALUES.has(stored.defaultLanding) ? stored.defaultLanding : defaults.defaultLanding,
    cards: [],
  };

  const seen = new Set();
  if (Array.isArray(stored.cards)) {
    for (const entry of stored.cards) {
      if (!entry || typeof entry !== 'object') continue;
      if (!KNOWN_CARD_IDS.includes(entry.id)) continue;
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      merged.cards.push({
        id: entry.id,
        visible: entry.visible !== false,
        order: merged.cards.length,
      });
    }
  }
  for (const id of KNOWN_CARD_IDS) {
    if (!seen.has(id)) {
      merged.cards.push({ id, visible: true, order: merged.cards.length });
    }
  }
  return merged;
};

const sanitizePreferencesPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { error: 'Preferences payload is required' };
  }

  const defaultLanding = DEFAULT_LANDING_VALUES.has(payload.defaultLanding)
    ? payload.defaultLanding
    : 'today';

  if (!Array.isArray(payload.cards)) {
    return { error: 'cards must be an array' };
  }

  const seen = new Set();
  const cards = [];

  // Preserve the user's order; drop unknown ids; deduplicate.
  for (const entry of payload.cards) {
    if (!entry || typeof entry !== 'object') continue;
    const id = String(entry.id || '');
    if (!KNOWN_CARD_IDS.includes(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    cards.push({
      id,
      visible: entry.visible !== false,
      order: cards.length,
    });
  }

  // Append any known card ids the client didn't send so the saved record is
  // complete. They land at the end with default visibility.
  for (const id of KNOWN_CARD_IDS) {
    if (!seen.has(id)) {
      cards.push({ id, visible: true, order: cards.length });
    }
  }

  return {
    value: {
      version: 1,
      defaultLanding,
      cards,
    },
  };
};

const loadPreferences = async ({ getAsync, userId }) => {
  const row = await getAsync(
    'SELECT dashboard_preferences AS prefs FROM users WHERE id = ?',
    [userId]
  );
  return mergeWithDefaults(row?.prefs);
};

const createDashboardRouter = ({ authRequired, allAsync, getAsync, runAsync }) => {
  const router = express.Router();
  const dashboardService = createDashboardService({ allAsync });

  router.use('/dashboard', authRequired);

  router.get('/dashboard', async (req, res) => {
    const tz = typeof req.query.tz === 'string' ? req.query.tz : '';
    const dueSoonDays = req.query.dueSoonDays;

    try {
      const [payload, preferences] = await Promise.all([
        dashboardService.loadDashboard(req.session.userId, { tz, dueSoonDays }),
        loadPreferences({ getAsync, userId: req.session.userId }),
      ]);
      res.set('Cache-Control', 'no-store');
      res.json({ ...payload, preferences });
    } catch (error) {
      console.error('Dashboard load failed:', error);
      res.status(500).json({ error: 'Failed to load dashboard' });
    }
  });

  router.put('/dashboard/preferences', async (req, res) => {
    const sanitized = sanitizePreferencesPayload(req.body);
    if (sanitized.error) {
      return res.status(400).json({ error: sanitized.error });
    }

    try {
      await runAsync(
        'UPDATE users SET dashboard_preferences = ? WHERE id = ?',
        [JSON.stringify(sanitized.value), req.session.userId]
      );
      res.json({
        preferences: sanitized.value,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Dashboard preferences save failed:', error);
      res.status(500).json({ error: 'Failed to save dashboard preferences' });
    }
  });

  router.post('/dashboard/preferences/reset', async (req, res) => {
    try {
      await runAsync(
        'UPDATE users SET dashboard_preferences = NULL WHERE id = ?',
        [req.session.userId]
      );
      res.json({ preferences: buildDefaultPreferences() });
    } catch (error) {
      console.error('Dashboard preferences reset failed:', error);
      res.status(500).json({ error: 'Failed to reset dashboard preferences' });
    }
  });

  return router;
};

module.exports = createDashboardRouter;
module.exports.KNOWN_CARD_IDS = KNOWN_CARD_IDS;
module.exports.buildDefaultPreferences = buildDefaultPreferences;
