const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_TAG_LENGTH = 40;
const MAX_TASK_TEXT_LENGTH = 10000;
const MAX_TASK_TITLE_LENGTH = 20;
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);
const VALID_STATUSES = new Set(['todo', 'in_progress', 'done']);
const TASK_PRIORITY_ORDER_SQL = `
  CASE tasks.priority
    WHEN 'high' THEN 0
    WHEN 'medium' THEN 1
    WHEN 'low' THEN 2
    ELSE 3
  END,
  tasks.created_at DESC
`;

module.exports = {
  MAX_ATTACHMENT_BYTES,
  MAX_TAG_LENGTH,
  MAX_TASK_TEXT_LENGTH,
  MAX_TASK_TITLE_LENGTH,
  TASK_PRIORITY_ORDER_SQL,
  VALID_PRIORITIES,
  VALID_STATUSES,
};
