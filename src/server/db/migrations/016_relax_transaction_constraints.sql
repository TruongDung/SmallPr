-- Update task status from 'completed' flag and relax transaction column constraints
UPDATE tasks SET status = 'done' WHERE completed = 1 AND status = 'todo';

-- Allow NULL values for optional transaction fields
ALTER TABLE transactions ALTER COLUMN category DROP NOT NULL;
ALTER TABLE transactions ALTER COLUMN account DROP NOT NULL;
ALTER TABLE transactions ALTER COLUMN note DROP NOT NULL;
