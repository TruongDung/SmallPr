-- Granular feature visibility for demo users. Consolidates the earlier
-- weather_enabled_for_demo flag and adds Financial tab + sub-tab controls.
-- Seeds with everything visible, carrying over the existing weather setting
-- when present so prior admin choices are preserved.
INSERT INTO app_settings (setting_key, setting_value)
VALUES (
  'demo_feature_visibility',
  jsonb_build_object(
    'weather', COALESCE(
      (SELECT setting_value FROM app_settings WHERE setting_key = 'weather_enabled_for_demo'),
      'true'::jsonb
    ),
    'financial', 'true'::jsonb,
    'financialTabs', jsonb_build_object(
      'cards', true,
      'info', true,
      'links', true,
      'transactions', true,
      'calendar', true
    )
  )
)
ON CONFLICT (setting_key) DO NOTHING;
