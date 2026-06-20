-- Feature flag controlling whether demo users can access the Weather feature.
-- Defaults to enabled so existing behavior is preserved.
INSERT INTO app_settings (setting_key, setting_value)
VALUES ('weather_enabled_for_demo', 'true'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
