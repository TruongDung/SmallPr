CREATE TABLE IF NOT EXISTS task_related_tasks (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  related_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, related_task_id),
  CHECK (task_id <> related_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_related_tasks_user_task
  ON task_related_tasks(user_id, task_id);

CREATE INDEX IF NOT EXISTS idx_task_related_tasks_related
  ON task_related_tasks(related_task_id);
