ALTER TABLE sprints ADD COLUMN IF NOT EXISTS archived INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sprints_archived ON sprints(archived);
