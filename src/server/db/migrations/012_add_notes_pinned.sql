-- Add pinning support to notes. Pinned notes sort to the top of the list.
ALTER TABLE notes ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;
