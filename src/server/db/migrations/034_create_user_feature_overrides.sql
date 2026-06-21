-- Per-user feature visibility overrides. When a row exists for a user, it takes
-- precedence over the global user_feature_visibility default. Admins are never
-- restricted. Stored as a full normalized visibility object per user.
CREATE TABLE IF NOT EXISTS user_feature_overrides (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  visibility JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
