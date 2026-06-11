ALTER TABLE tasks ADD COLUMN sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON tasks(sprint_id);
