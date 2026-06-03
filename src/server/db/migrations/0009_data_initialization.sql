-- Initialize default fast access bills
INSERT INTO fast_access_bill_defaults (item, amount, due_date, pay_before, status, sort_order)
VALUES
  ('Rent',        0.00, '', '', 'Unpaid', 1),
  ('Electricity', 0.00, '', '', 'Unpaid', 2),
  ('Water',       0.00, '', '', 'Unpaid', 3),
  ('Gas',         0.00, '', '', 'Unpaid', 4),
  ('Internet',    0.00, '', '', 'Unpaid', 5),
  ('Phone',       0.00, '', '', 'Unpaid', 6),
  ('HOA',         0.00, '', '', 'Unpaid', 7),
  ('Auto loan',   0.00, '', '', 'Unpaid', 8),
  ('Daycare',     0.00, '', '', 'Unpaid', 9)
ON CONFLICT (sort_order) DO NOTHING;

-- Populate task tags from existing task records
INSERT INTO task_tags (user_id, name, normalized_name)
SELECT DISTINCT user_id, tag, LOWER(tag)
FROM tasks
WHERE tag IS NOT NULL AND TRIM(tag) <> ''
ON CONFLICT (user_id, normalized_name) DO NOTHING;
