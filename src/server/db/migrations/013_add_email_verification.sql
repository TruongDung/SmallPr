ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP;

UPDATE users
SET account_status = 'enabled'
WHERE account_status IS NULL OR account_status NOT IN ('enabled', 'disabled', 'pending_verification');
