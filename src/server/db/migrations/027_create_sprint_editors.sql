CREATE TABLE IF NOT EXISTS sprint_editors (
  sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (sprint_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sprint_editors_user_id ON sprint_editors(user_id);
