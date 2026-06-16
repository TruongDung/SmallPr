-- Store Google Drive file ID for attachments uploaded to Drive
-- instead of storing base64 data in the database.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_drive_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_url TEXT;
