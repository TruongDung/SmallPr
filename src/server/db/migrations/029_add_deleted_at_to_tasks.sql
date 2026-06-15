-- Soft-delete: tasks are not permanently removed immediately. Instead
-- deleted_at is set to the current timestamp. A cleanup job purges tasks
-- older than 30 days from the trash.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Index for efficient trash listing and auto-purge queries
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks (deleted_at)
  WHERE deleted_at IS NOT NULL;
