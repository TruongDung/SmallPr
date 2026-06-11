ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS is_system_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lunar_day INTEGER,
  ADD COLUMN IF NOT EXISTS lunar_month INTEGER,
  ADD COLUMN IF NOT EXISTS lunar_year INTEGER,
  ADD COLUMN IF NOT EXISTS reminder_date DATE,
  ADD COLUMN IF NOT EXISTS lunar_event_date DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_type_check'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_type_check CHECK (type IN ('NORMAL', 'LUNAR_REMINDER'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_lunar_reminder_lookup
  ON tasks(user_id, type, lunar_day, reminder_date)
  WHERE type = 'LUNAR_REMINDER';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_lunar_reminder_unique
  ON tasks(user_id, type, lunar_day, reminder_date)
  WHERE type = 'LUNAR_REMINDER';

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enable_lunar_reminder BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_days_before INTEGER NOT NULL DEFAULT 3 CHECK (reminder_days_before BETWEEN 0 AND 30),
  remind_lunar_day1 BOOLEAN NOT NULL DEFAULT TRUE,
  remind_lunar_day15 BOOLEAN NOT NULL DEFAULT TRUE,
  show_lunar_dates_in_calendar BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
