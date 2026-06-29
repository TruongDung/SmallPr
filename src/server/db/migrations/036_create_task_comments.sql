-- Multiple comments per task. The legacy single `tasks.comment` column is kept
-- intact for backward compatibility; this table powers the threaded comment
-- list shown in the task detail view. Comments are authored by a user and
-- cascade-deleted with their task (and with the author's account).
CREATE TABLE IF NOT EXISTS task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task
  ON task_comments(task_id, created_at);
