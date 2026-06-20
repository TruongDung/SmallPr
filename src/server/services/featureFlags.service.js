// Feature flag service backed by the app_settings table.
// Currently controls whether demo users can access the Weather feature.

const WEATHER_DEMO_KEY = 'weather_enabled_for_demo';

// Settings values are stored as JSONB. They may come back as a real boolean,
// or as a stringified boolean depending on how they were written. Normalize
// both, defaulting to enabled when unset/unknown.
const normalizeBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() !== 'false';
  if (value === null || value === undefined) return fallback;
  return value !== false;
};

const createFeatureFlagsService = ({ allAsync, runAsync }) => {
  const getWeatherEnabledForDemo = async () => {
    const rows = await allAsync(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?',
      [WEATHER_DEMO_KEY]
    );
    return normalizeBoolean(rows[0]?.setting_value ?? true);
  };

  const setWeatherEnabledForDemo = async (enabled) => {
    const normalized = Boolean(enabled);
    await runAsync(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at)
       VALUES (?, ?::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value,
                     updated_at = CURRENT_TIMESTAMP`,
      [WEATHER_DEMO_KEY, JSON.stringify(normalized)]
    );
    return { weatherEnabledForDemo: normalized };
  };

  const getSettings = async () => ({
    weatherEnabledForDemo: await getWeatherEnabledForDemo(),
  });

  // Flags safe to expose publicly (consumed by the frontend, including demo mode).
  const getPublicFlags = async () => ({
    weatherEnabledForDemo: await getWeatherEnabledForDemo(),
  });

  return {
    getWeatherEnabledForDemo,
    setWeatherEnabledForDemo,
    getSettings,
    getPublicFlags,
  };
};

module.exports = createFeatureFlagsService;
