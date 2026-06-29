// Feature flag service backed by the app_settings table.
// Controls granular feature visibility, independently for two audiences:
//   - demo users  → `demo_feature_visibility`
//   - all regular (non-admin) users → `user_feature_visibility`
//
// Each is a single JSON object so the whole visibility model can be read/written
// atomically. Admins always see every feature regardless of these flags.

const VISIBILITY_KEYS = {
  demo: 'demo_feature_visibility',
  user: 'user_feature_visibility',
};

// The Financial sub-tabs that can be toggled independently. Keep in sync with
// the `data-financial-tab` values in index.html / creditCards.dom.js.
const FINANCIAL_TAB_IDS = ['cards', 'info', 'links', 'transactions', 'calendar'];

const toBool = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() !== 'false';
  if (value === null || value === undefined) return fallback;
  return value !== false;
};

const defaultVisibility = () => ({
  weather: true,
  financial: true,
  userSettings: true,
  financialTabs: FINANCIAL_TAB_IDS.reduce((acc, id) => {
    acc[id] = true;
    return acc;
  }, {}),
});

// Coerce arbitrary stored/incoming data into the canonical visibility shape so
// the rest of the app can rely on every field being present and boolean.
const normalizeVisibility = (raw) => {
  const base = defaultVisibility();
  if (!raw || typeof raw !== 'object') return base;

  const result = {
    weather: toBool(raw.weather, base.weather),
    financial: toBool(raw.financial, base.financial),
    userSettings: toBool(raw.userSettings, base.userSettings),
    financialTabs: { ...base.financialTabs },
  };

  const tabs = raw.financialTabs;
  if (tabs && typeof tabs === 'object') {
    FINANCIAL_TAB_IDS.forEach((id) => {
      if (id in tabs) result.financialTabs[id] = toBool(tabs[id], true);
    });
  }

  return result;
};

const resolveKey = (scope) => VISIBILITY_KEYS[scope] || VISIBILITY_KEYS.demo;

const createFeatureFlagsService = ({ allAsync, runAsync }) => {
  const getVisibility = async (scope) => {
    const rows = await allAsync('SELECT setting_value FROM app_settings WHERE setting_key = ?', [resolveKey(scope)]);
    return normalizeVisibility(rows[0]?.setting_value);
  };

  const setVisibility = async (scope, updates) => {
    // Merge incoming partial updates over the current persisted state so the
    // admin UI can send just the field that changed.
    const current = await getVisibility(scope);
    const merged = normalizeVisibility({
      weather: updates?.weather ?? current.weather,
      financial: updates?.financial ?? current.financial,
      userSettings: updates?.userSettings ?? current.userSettings,
      financialTabs: {
        ...current.financialTabs,
        ...(updates?.financialTabs && typeof updates.financialTabs === 'object' ? updates.financialTabs : {}),
      },
    });

    await runAsync(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at)
       VALUES (?, ?::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value,
                     updated_at = CURRENT_TIMESTAMP`,
      [resolveKey(scope), JSON.stringify(merged)],
    );
    return merged;
  };

  // --- Scope-specific convenience wrappers ---
  const getDemoVisibility = () => getVisibility('demo');
  const setDemoVisibility = (updates) => setVisibility('demo', updates);
  const getUserVisibility = () => getVisibility('user');
  const setUserVisibility = (updates) => setVisibility('user', updates);

  // --- Weather convenience wrappers (kept for backward compatibility) ---
  const getWeatherEnabledForDemo = async () => (await getDemoVisibility()).weather;

  const setWeatherEnabledForDemo = async (enabled) => {
    const merged = await setDemoVisibility({ weather: Boolean(enabled) });
    return { weatherEnabledForDemo: merged.weather };
  };

  // --- Per-user overrides ---
  // Returns the stored override for a user, or null when none exists.
  const getUserOverride = async (userId) => {
    const rows = await allAsync('SELECT visibility FROM user_feature_overrides WHERE user_id = ?', [userId]);
    if (!rows.length) return null;
    return normalizeVisibility(rows[0].visibility);
  };

  // The visibility that actually applies to a user: their override if present,
  // otherwise the global all-users default.
  const getEffectiveUserVisibility = async (userId) => {
    const override = await getUserOverride(userId);
    if (override) return override;
    return getUserVisibility();
  };

  // Merge a partial update for a user over their current effective visibility
  // and persist it as a full override row.
  const setUserOverride = async (userId, updates) => {
    const current = await getEffectiveUserVisibility(userId);
    const merged = normalizeVisibility({
      weather: updates?.weather ?? current.weather,
      financial: updates?.financial ?? current.financial,
      userSettings: updates?.userSettings ?? current.userSettings,
      financialTabs: {
        ...current.financialTabs,
        ...(updates?.financialTabs && typeof updates.financialTabs === 'object' ? updates.financialTabs : {}),
      },
    });

    await runAsync(
      `INSERT INTO user_feature_overrides (user_id, visibility, updated_at)
       VALUES (?, ?::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET visibility = EXCLUDED.visibility,
                     updated_at = CURRENT_TIMESTAMP`,
      [userId, JSON.stringify(merged)],
    );
    return merged;
  };

  // Remove a user's override so they fall back to the global default.
  const clearUserOverride = async (userId) => {
    await runAsync('DELETE FROM user_feature_overrides WHERE user_id = ?', [userId]);
    return getUserVisibility();
  };

  const getSettings = async () => ({
    demoVisibility: await getDemoVisibility(),
    userVisibility: await getUserVisibility(),
  });

  // Flags exposed publicly (consumed by the frontend, including demo mode).
  const getPublicFlags = async () => {
    const [demoVisibility, userVisibility] = await Promise.all([getDemoVisibility(), getUserVisibility()]);
    return {
      // Retained so older clients keep working.
      weatherEnabledForDemo: demoVisibility.weather,
      demoVisibility,
      userVisibility,
    };
  };

  return {
    FINANCIAL_TAB_IDS,
    getVisibility,
    setVisibility,
    getDemoVisibility,
    setDemoVisibility,
    getUserVisibility,
    setUserVisibility,
    getUserOverride,
    getEffectiveUserVisibility,
    setUserOverride,
    clearUserOverride,
    getWeatherEnabledForDemo,
    setWeatherEnabledForDemo,
    getSettings,
    getPublicFlags,
  };
};

module.exports = createFeatureFlagsService;
module.exports.FINANCIAL_TAB_IDS = FINANCIAL_TAB_IDS;
