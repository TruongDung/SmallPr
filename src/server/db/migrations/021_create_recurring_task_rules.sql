CREATE TABLE IF NOT EXISTS recurring_task_rules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL,
  interval INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE,
  occurrence_limit INTEGER,
  weekdays INTEGER[],
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'active',
  generated_count INTEGER NOT NULL DEFAULT 0,
  next_due_date DATE,
  last_generated_due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  CHECK (interval > 0),
  CHECK (occurrence_limit IS NULL OR occurrence_limit > 0),
  CHECK (status IN ('active', 'paused', 'deleted'))
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_rule_id INTEGER REFERENCES recurring_task_rules(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_occurrence_index INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_timezone TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_occurrence_limit INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS recurring_task_rules_template_idx
  ON recurring_task_rules (template_task_id)
  WHERE template_task_id IS NOT NULL AND status <> 'deleted';

CREATE UNIQUE INDEX IF NOT EXISTS tasks_recurring_rule_due_date_idx
  ON tasks (recurring_rule_id, due_date)
  WHERE recurring_rule_id IS NOT NULL AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS recurring_task_rules_worker_idx
  ON recurring_task_rules (status, next_due_date, id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS tasks_recurring_rule_idx
  ON tasks (recurring_rule_id, recurrence_occurrence_index);
