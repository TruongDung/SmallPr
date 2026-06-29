/**
 * Audit Changes Utility
 *
 * Generates detailed change summaries for audit logs by comparing
 * before and after states of entities. Provides human-readable
 * descriptions of what changed.
 *
 * @module utils/auditChanges
 */

/**
 * Field display names for better readability in audit logs
 */
const FIELD_LABELS = {
  // Common fields
  title: 'Title',
  description: 'Description',
  status: 'Status',
  priority: 'Priority',

  // User fields
  username: 'Username',
  email: 'Email',
  name: 'Full Name',
  account_status: 'Account Status',
  is_admin: 'Admin Status',

  // Task fields
  tag: 'Tag',
  comment: 'Comment',
  completed: 'Completed',
  archived: 'Archived',
  time_spent_minutes: 'Time Spent',
  reminder_at: 'Reminder',
  is_recurring: 'Recurring',
  recurrence_pattern: 'Recurrence Pattern',

  // Credit card fields
  name: 'Card Name',
  card_user: 'Card User',
  issuer: 'Issuer',
  total_balance: 'Balance',

  // Transaction fields
  amount: 'Amount',
  kind: 'Type',
  category: 'Category',
  merchant: 'Merchant',
  transaction_date: 'Date',

  // Note fields
  body: 'Content',
  pinned: 'Pinned',
  task_id: 'Linked Task',

  // Timestamps
  created_at: 'Created At',
  updated_at: 'Updated At',
};

/**
 * Fields to ignore in change detection (internal/system fields)
 */
const IGNORED_FIELDS = new Set(['id', 'user_id', 'created_at', 'updated_at', 'last_modified_at', 'version']);

/**
 * Format a field value for display in audit logs
 *
 * @param {string} field - Field name
 * @param {*} value - Field value
 * @returns {string} Formatted value
 */
const formatValue = (field, value) => {
  if (value === null || value === undefined) {
    return 'empty';
  }

  // Boolean fields
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Numeric boolean (0/1)
  if (field === 'completed' || field === 'archived' || field === 'pinned' || field === 'is_admin') {
    return value ? 'Yes' : 'No';
  }

  // Date/time fields
  if (field.includes('_at') || field.includes('_date')) {
    if (!value) return 'not set';
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Amount fields
  if (field.includes('amount') || field.includes('balance')) {
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return `$${num.toFixed(2)}`;
  }

  // Time spent (minutes to hours)
  if (field === 'time_spent_minutes') {
    const minutes = Number(value);
    if (isNaN(minutes)) return String(value);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }

  // Arrays
  if (Array.isArray(value)) {
    return value.length === 0 ? 'empty' : value.join(', ');
  }

  // Objects
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  // String truncation for long values
  const str = String(value);
  if (str.length > 100) {
    return str.substring(0, 97) + '...';
  }

  return str;
};

/**
 * Get field label for display
 *
 * @param {string} field - Field name
 * @returns {string} Display label
 */
const getFieldLabel = (field) => {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Compare two values and determine if they're different
 *
 * @param {*} before - Before value
 * @param {*} after - After value
 * @returns {boolean} True if values are different
 */
const isDifferent = (before, after) => {
  // Null/undefined handling
  if (before === null || before === undefined) {
    return after !== null && after !== undefined && after !== '';
  }
  if (after === null || after === undefined) {
    return before !== null && before !== undefined && before !== '';
  }

  // Array comparison
  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length) return true;
    return before.some((item, index) => isDifferent(item, after[index]));
  }

  // Object comparison
  if (typeof before === 'object' && typeof after === 'object') {
    const keysB = Object.keys(before);
    const keysA = Object.keys(after);
    if (keysB.length !== keysA.length) return true;
    return keysB.some((key) => isDifferent(before[key], after[key]));
  }

  // Loose equality for numbers and strings
  return String(before) !== String(after);
};

/**
 * Detect changes between before and after states
 *
 * @param {Object} before - Before state
 * @param {Object} after - After state
 * @returns {Array<Object>} Array of change objects
 */
const detectChanges = (before, after) => {
  if (!before || !after) {
    return [];
  }

  const changes = [];
  const allFields = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const field of allFields) {
    // Skip ignored fields
    if (IGNORED_FIELDS.has(field)) {
      continue;
    }

    const beforeValue = before[field];
    const afterValue = after[field];

    // Skip if values are the same
    if (!isDifferent(beforeValue, afterValue)) {
      continue;
    }

    changes.push({
      field,
      label: getFieldLabel(field),
      before: formatValue(field, beforeValue),
      after: formatValue(field, afterValue),
    });
  }

  return changes;
};

/**
 * Generate a human-readable change summary
 *
 * @param {Array<Object>} changes - Array of change objects from detectChanges
 * @param {Object} options - Options for summary generation
 * @param {number} options.maxFields - Maximum number of fields to include (default: 5)
 * @param {boolean} options.includeValues - Include before/after values (default: true)
 * @returns {string} Human-readable change summary
 */
const generateChangeSummary = (changes, options = {}) => {
  const { maxFields = 5, includeValues = true } = options;

  if (!changes || changes.length === 0) {
    return 'No changes detected';
  }

  const limitedChanges = changes.slice(0, maxFields);
  const remaining = changes.length - limitedChanges.length;

  const parts = limitedChanges.map((change) => {
    if (includeValues) {
      if (change.before === 'empty' || change.before === '' || change.before === null) {
        return `${change.label}: set to "${change.after}"`;
      } else if (change.after === 'empty' || change.after === '' || change.after === null) {
        return `${change.label}: cleared (was "${change.before}")`;
      } else {
        return `${change.label}: "${change.before}" → "${change.after}"`;
      }
    } else {
      return change.label;
    }
  });

  let summary = parts.join('; ');

  if (remaining > 0) {
    summary += `; and ${remaining} more field${remaining > 1 ? 's' : ''}`;
  }

  return summary;
};

/**
 * Generate a detailed change list (for UI display)
 *
 * @param {Object} before - Before state
 * @param {Object} after - After state
 * @returns {Object} Change details with summary and list
 */
const generateChangeDetails = (before, after) => {
  const changes = detectChanges(before, after);

  return {
    summary: generateChangeSummary(changes, { maxFields: 3, includeValues: true }),
    fullSummary: generateChangeSummary(changes, { maxFields: Infinity, includeValues: true }),
    changeCount: changes.length,
    changes: changes.map((change) => ({
      field: change.field,
      label: change.label,
      before: change.before,
      after: change.after,
    })),
  };
};

/**
 * Enhance audit log entry with change details
 * This should be called before storing the audit log
 *
 * @param {Object} auditEntry - Audit log entry
 * @returns {Object} Enhanced audit entry with change details
 */
const enhanceAuditEntry = (auditEntry) => {
  const { action, before, after, summary } = auditEntry;

  // Only add change details for edit actions
  if (action !== 'edit' || !before || !after) {
    return auditEntry;
  }

  const changes = detectChanges(before, after);
  const changeSummary = generateChangeSummary(changes, { maxFields: 3, includeValues: true });

  // Enhance the summary to include change details
  const enhancedSummary = summary ? `${summary} - ${changeSummary}` : changeSummary;

  return {
    ...auditEntry,
    summary: enhancedSummary,
    changeCount: changes.length,
  };
};

/**
 * Format audit log for display (extract changes from before/after)
 * Use this when displaying audit logs in UI
 *
 * @param {Object} auditLog - Audit log entry from database
 * @returns {Object} Formatted audit log with parsed changes
 */
const formatAuditLogForDisplay = (auditLog) => {
  const formatted = { ...auditLog };

  // Parse JSON fields if they're strings
  if (typeof auditLog.before_data === 'string') {
    try {
      formatted.before_data = JSON.parse(auditLog.before_data);
    } catch (e) {
      // Keep as is if parsing fails
    }
  }

  if (typeof auditLog.after_data === 'string') {
    try {
      formatted.after_data = JSON.parse(auditLog.after_data);
    } catch (e) {
      // Keep as is if parsing fails
    }
  }

  // Add change details for edit actions
  if (auditLog.action === 'edit' && formatted.before_data && formatted.after_data) {
    const changeDetails = generateChangeDetails(formatted.before_data, formatted.after_data);
    formatted.changeDetails = changeDetails;
  }

  return formatted;
};

module.exports = {
  detectChanges,
  generateChangeSummary,
  generateChangeDetails,
  enhanceAuditEntry,
  formatAuditLogForDisplay,
  formatValue,
  getFieldLabel,
  isDifferent,
};
