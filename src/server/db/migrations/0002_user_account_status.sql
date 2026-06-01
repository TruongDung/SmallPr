ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'enabled';
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE users
SET account_status = 'enabled'
WHERE account_status IS NULL OR account_status NOT IN ('enabled', 'disabled');

UPDATE users
SET account_status_changed_at = CURRENT_TIMESTAMP
WHERE account_status_changed_at IS NULL;
