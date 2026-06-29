# 📝 Enhanced Audit Logging Guide

## Overview

The Task Manager application now includes a **comprehensive audit logging system** that automatically tracks and displays detailed changes to entities. Every create, update, and delete operation is logged with:

- ✅ **Who** made the change (user, actor, impersonator)
- ✅ **What** was changed (entity type and ID)
- ✅ **When** it happened (timestamp)
- ✅ **How** it changed (detailed field-by-field comparison)
- ✅ **Why** context (IP address, user agent, session)

## 🎯 Key Features

### Automatic Change Detection

- Compares before/after states automatically
- Identifies which fields changed
- Formats values for readability
- Generates human-readable summaries

### Smart Value Formatting

- **Dates**: "Jan 15, 2024, 02:30 PM"
- **Amounts**: "$1,234.56"
- **Booleans**: "Yes" / "No"
- **Time**: "2h 30min"
- **Long text**: Truncated with "..."

### Detailed Change Summaries

```
Title: "Old Task" → "New Task"; Status: "todo" → "done"; Priority: "low" → "high"
```

## 🛠️ How to Use

### Basic Usage (Routes)

```javascript
const { logCreate, logUpdate, logDelete } = require('../utils/auditDecorator');

// Create operation
router.post(
  '/tasks',
  asyncHandler(async (req, res) => {
    const task = await tasksService.createTask(req.body);

    await logCreate({
      auditLogs,
      req,
      entityType: 'task',
      entityId: task.id,
      summary: task.title,
      after: task,
    });

    sendSuccess(res, { task });
  }),
);

// Update operation (with automatic change detection)
router.put(
  '/tasks/:id',
  asyncHandler(async (req, res) => {
    const oldTask = await tasksService.getTask(id);
    const updatedTask = await tasksService.updateTask(id, req.body);

    await logUpdate({
      auditLogs,
      req,
      entityType: 'task',
      entityId: task.id,
      summary: updatedTask.title,
      before: oldTask, // System compares these automatically
      after: updatedTask, // and generates detailed change summary
    });

    sendSuccess(res, { task: updatedTask });
  }),
);

// Delete operation
router.delete(
  '/tasks/:id',
  asyncHandler(async (req, res) => {
    const task = await tasksService.getTask(id);
    await tasksService.deleteTask(id);

    await logDelete({
      auditLogs,
      req,
      entityType: 'task',
      entityId: task.id,
      summary: task.title,
      before: task,
    });

    sendSuccess(res, { success: true });
  }),
);
```

### Advanced Usage (Manual Change Detection)

```javascript
const { detectChanges, generateChangeSummary } = require('../utils/auditChanges');

// Detect specific changes
const changes = detectChanges(oldTask, newTask);
console.log('Changes detected:', changes);
// [
//   { field: 'title', label: 'Title', before: 'Old', after: 'New' },
//   { field: 'status', label: 'Status', before: 'todo', after: 'done' }
// ]

// Generate summary
const summary = generateChangeSummary(changes);
console.log(summary);
// "Title: "Old" → "New"; Status: "todo" → "done"
```

## 📊 Audit Log Structure

### Database Schema

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  actor_user_id INTEGER REFERENCES users(id),
  impersonator_user_id INTEGER REFERENCES users(id),
  action VARCHAR(50) NOT NULL,           -- create, edit, delete, login, register
  entity_type VARCHAR(50) NOT NULL,       -- task, user, note, etc.
  entity_id INTEGER,
  summary TEXT,                          -- Enhanced with change details!
  before_data JSONB,                     -- State before change
  after_data JSONB,                      -- State after change
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Enhanced Summary Field

**Before Enhancement:**

```
"Buy groceries"
```

**After Enhancement:**

```
"Buy groceries - Status: "todo" → "done"; Priority: "low" → "high"; Time Spent: set to "2h 30min""
```

## 🎨 UI Display Examples

### Audit Log List View

```javascript
// Frontend component
function AuditLogList() {
  const { data } = useQuery('auditLogs', () => fetch('/api/audit-logs').then((r) => r.json()));

  return (
    <div>
      {data.logs.map((log) => (
        <AuditLogItem key={log.id}>
          <User>{log.actor_username}</User>
          <Action>{log.action}</Action>
          <Entity>
            {log.entity_type} #{log.entity_id}
          </Entity>
          <Summary>{log.summary}</Summary>
          <Time>{formatTime(log.created_at)}</Time>

          {/* Show detailed changes if available */}
          {log.changeDetails && (
            <ChangeList>
              {log.changeDetails.changes.map((change) => (
                <Change key={change.field}>
                  <Label>{change.label}:</Label>
                  <Before>{change.before}</Before>
                  <Arrow>→</Arrow>
                  <After>{change.after}</After>
                </Change>
              ))}
            </ChangeList>
          )}
        </AuditLogItem>
      ))}
    </div>
  );
}
```

### Example Output

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔧 John Doe edited task #123                                    │
│ "Complete documentation"                                         │
│                                                                  │
│ Changes:                                                         │
│ • Status: "in-progress" → "done"                                │
│ • Priority: "medium" → "high"                                   │
│ • Time Spent: "1h" → "2h 30min"                                 │
│                                                                  │
│ 📅 Jan 15, 2024, 02:30 PM                                       │
└─────────────────────────────────────────────────────────────────┘
```

## 🔍 Querying Audit Logs

### API Endpoints

#### GET /api/audit-logs

List all audit logs with filtering

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 500)
- `entityType` - Filter by type: task, user, note, etc.
- `action` - Filter by action: create, edit, delete
- `userId` - Filter by user ID
- `search` - Full-text search

**Example:**

```bash
GET /api/audit-logs?entityType=task&action=edit&page=1&limit=20
```

**Response:**

```json
{
  "logs": [
    {
      "id": 1234,
      "user_id": 5,
      "username": "john.doe",
      "actor_user_id": 5,
      "actor_username": "john.doe",
      "action": "edit",
      "entity_type": "task",
      "entity_id": 123,
      "summary": "Complete documentation - Status: \"in-progress\" → \"done\"; Priority: \"medium\" → \"high\"",
      "before_data": { ... },
      "after_data": { ... },
      "created_at": "2024-01-15T14:30:00Z",
      "changeDetails": {
        "summary": "Status: \"in-progress\" → \"done\"; Priority: \"medium\" → \"high\"",
        "changeCount": 2,
        "changes": [
          {
            "field": "status",
            "label": "Status",
            "before": "in-progress",
            "after": "done"
          },
          {
            "field": "priority",
            "label": "Priority",
            "before": "medium",
            "after": "high"
          }
        ]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

#### GET /api/audit-logs/entity/:entityType/:entityId

Get audit history for a specific entity

**Example:**

```bash
GET /api/audit-logs/entity/task/123
```

Returns all audit logs for task #123 in chronological order.

## 📋 Supported Fields

### Field Display Names

The system recognizes and formats these fields:

#### Common Fields

- `title` → "Title"
- `description` → "Description"
- `status` → "Status"
- `priority` → "Priority"

#### User Fields

- `username` → "Username"
- `email` → "Email"
- `name` → "Full Name"
- `account_status` → "Account Status"
- `is_admin` → "Admin Status"

#### Task Fields

- `tag` → "Tag"
- `comment` → "Comment"
- `completed` → "Completed"
- `archived` → "Archived"
- `time_spent_minutes` → "Time Spent"
- `reminder_at` → "Reminder"
- `is_recurring` → "Recurring"

#### Financial Fields

- `amount` → "Amount"
- `total_balance` → "Balance"
- `kind` → "Type"
- `category` → "Category"

### Ignored Fields

These fields are automatically ignored in change detection:

- `id`
- `user_id`
- `created_at`
- `updated_at`
- `last_modified_at`
- `version`

## 🎨 Customizing Change Display

### Adding New Field Labels

Edit `src/server/utils/auditChanges.js`:

```javascript
const FIELD_LABELS = {
  // Add your custom fields here
  custom_field: 'Custom Field Label',
  my_special_field: 'My Special Field',
};
```

### Custom Value Formatting

```javascript
const formatValue = (field, value) => {
  // Add custom formatting
  if (field === 'my_custom_field') {
    return `Custom: ${value}`;
  }

  // ... existing formatting logic
};
```

## 🧪 Testing Audit Logs

### Example Test

```javascript
describe('Audit Logging', () => {
  it('should log task update with change details', async () => {
    const oldTask = { title: 'Old', status: 'todo', priority: 'low' };
    const newTask = { title: 'New', status: 'done', priority: 'high' };

    const changes = detectChanges(oldTask, newTask);

    expect(changes).toHaveLength(3);
    expect(changes[0]).toEqual({
      field: 'title',
      label: 'Title',
      before: 'Old',
      after: 'New',
    });

    const summary = generateChangeSummary(changes);
    expect(summary).toContain('Title: "Old" → "New"');
    expect(summary).toContain('Status: "todo" → "done"');
  });
});
```

## 🔒 Security Considerations

### Access Control

- Audit log viewing is **admin-only** by default
- Use `adminRequired` middleware for all audit routes
- Never expose sensitive data (passwords, tokens) in audit logs

### Data Sanitization

```javascript
// Sanitize sensitive fields before logging
const sanitizeForAudit = (data) => {
  const sanitized = { ...data };
  delete sanitized.password;
  delete sanitized.password_hash;
  delete sanitized.api_key;
  delete sanitized.token;
  return sanitized;
};

await logUpdate({
  auditLogs,
  req,
  entityType: 'user',
  entityId: user.id,
  summary: user.username,
  before: sanitizeForAudit(oldUser),
  after: sanitizeForAudit(newUser),
});
```

## 📈 Performance Considerations

### Database Indexing

```sql
-- Recommended indexes for audit_logs table
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Full-text search index
CREATE INDEX idx_audit_logs_fts ON audit_logs USING GIN (
  to_tsvector('simple',
    COALESCE(summary, '') || ' ' ||
    COALESCE(before_data::text, '') || ' ' ||
    COALESCE(after_data::text, '')
  )
);
```

### Pagination

- Always use pagination for audit log lists
- Default limit: 50, max limit: 500
- Use cursor-based pagination for very large datasets

### Archiving Old Logs

```sql
-- Archive logs older than 1 year
CREATE TABLE audit_logs_archive AS
SELECT * FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';
```

## 🎯 Best Practices

### 1. Always Provide Context

```javascript
// ✅ GOOD - Descriptive summary
await logUpdate({
  summary: `${user.username} updated profile`,
  // ...
});

// ❌ BAD - Generic summary
await logUpdate({
  summary: 'update',
  // ...
});
```

### 2. Include Before/After for Updates

```javascript
// ✅ GOOD - Full state tracking
const oldTask = await getTask(id);
const newTask = await updateTask(id, data);
await logUpdate({ before: oldTask, after: newTask });

// ❌ BAD - Missing before state
await logUpdate({ after: newTask });
```

### 3. Use Semantic Entity Types

```javascript
// ✅ GOOD - Clear entity types
entityType: 'task';
entityType: 'user';
entityType: 'credit_card';

// ❌ BAD - Vague entity types
entityType: 'item';
entityType: 'thing';
```

### 4. Don't Log Sensitive Data

```javascript
// ✅ GOOD - Sanitized
const userForAudit = sanitizeForAudit(user);

// ❌ BAD - Includes password
await logCreate({ after: user }); // Don't do this!
```

## 📚 API Reference

### detectChanges(before, after)

Compares two objects and returns array of changes

**Returns:** `Array<{ field, label, before, after }>`

### generateChangeSummary(changes, options)

Generates human-readable summary from changes

**Options:**

- `maxFields` - Max fields to include (default: 5)
- `includeValues` - Include before/after values (default: true)

**Returns:** `string`

### enhanceAuditEntry(auditEntry)

Adds change details to audit entry before saving

**Returns:** Enhanced audit entry with `summary` and `changeCount`

### formatAuditLogForDisplay(auditLog)

Formats audit log for UI display with parsed changes

**Returns:** Audit log with `changeDetails` object

## 🆘 Troubleshooting

### Changes Not Showing

- Ensure `before` and `after` objects are provided
- Check that fields aren't in `IGNORED_FIELDS` list
- Verify action is `'edit'`

### Incorrect Field Labels

- Add custom labels to `FIELD_LABELS` object
- Restart server after changes

### Performance Issues

- Add database indexes
- Enable pagination
- Limit search scope
- Archive old logs

---

**Your audit logging system now provides enterprise-grade change tracking!** 🎉
