CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  password TEXT NOT NULL,
  account_status TEXT NOT NULL DEFAULT 'enabled',
  account_status_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  timezone TEXT,
  language TEXT,
  dashboard_preferences JSONB
);
