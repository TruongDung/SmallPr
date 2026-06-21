-- Granular feature visibility for ALL regular (non-admin) users. Mirrors the
-- demo_feature_visibility model. Seeds with everything visible so existing
-- behavior is preserved. Admins always see every feature regardless.
INSERT INTO app_settings (setting_key, setting_value)
VALUES (
  'user_feature_visibility',
  jsonb_build_object(
    'weather', true,
    'financial', true,
    'userSettings', true,
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
