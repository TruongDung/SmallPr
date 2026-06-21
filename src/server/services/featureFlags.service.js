// Feature flag service backed by the app_settings table.
// Controls granular feature visibility for demo users:
//   - Weather feature
//   - Financial tab (master)
//   - Each Financial sub-tab independently
//
// Stored as a single JSON object under the `demo_feature_visibility` key so the
// whole visibility model can be read/written atomically.

const DEMO_VISIBILITY_KEY = 'demo_feature_visibility';

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

const createFeatureFlagsService = ({ allAsync, runAsync }) => {
  const getDemoVisibility = async () => {
    const rows = await allAsync(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?',
      [DEMO_VISIBILITY_KEY]
    );
    return normalizeVisibility(rows[0]?.setting_value);
  };

  const setDemoVisibility = async (updates) => {
    // Merge incoming partial updates over the current persisted state so the
    // admin UI can send just the field that changed.
    const current = await getDemoVisibility();
    const merged = normalizeVisibility({
      weather: updates?.weather ?? current.weather,
      financial: updates?.financial ?? current.financial,
      userSettings: updates?.userSettings ?? current.userSettings,
      financialTabs: {
        ...current.financialTabs,
        ...(updates?.financialTabs && typeof updates.financialTabs === 'object'
          ? updates.financialTabs
          : {}),
      },
    });

    await runAsync(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at)
       VALUES (?, ?::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value,
                     updated_at = CURRENT_TIMESTAMP`,
      [DEMO_VISIBILITY_KEY, JSON.stringify(merged)]
    );
    return merged;
  };

  // --- Weather convenience wrappers (kept for backward compatibility) ---
  const getWeatherEnabledForDemo = async () => (await getDemoVisibility()).weather;

  const setWeatherEnabledForDemo = async (enabled) => {
    const merged = await setDemoVisibility({ weather: Boolean(enabled) });
    return { weatherEnabledForDemo: merged.weather };
  };

  const getSettings = async () => ({
    demoVisibility: await getDemoVisibility(),
  });

  // Flags exposed publicly (consumed by the frontend, including demo mode).
  const getPublicFlags = async () => {
    const demoVisibility = await getDemoVisibility();
    return {
      // Retained so older clients keep working.
      weatherEnabledForDemo: demoVisibility.weather,
      demoVisibility,
    };
  };

  return {
    FINANCIAL_TAB_IDS,
    getDemoVisibility,
    setDemoVisibility,
    getWeatherEnabledForDemo,
    setWeatherEnabledForDemo,
    getSettings,
    getPublicFlags,
  };
};

module.exports = createFeatureFlagsService;
module.exports.FINANCIAL_TAB_IDS = FINANCIAL_TAB_IDS;
