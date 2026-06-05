-- Add task due dates for calendar planning and deadline views.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;

