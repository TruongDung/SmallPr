# 📊 Audit Logging Examples

Visual examples of how the enhanced audit logging system tracks changes.

## Example 1: Task Update

### Original Audit Log (Before Enhancement)

```json
{
  "id": 1234,
  "action": "edit",
  "entity_type": "task",
  "entity_id": 123,
  "summary": "Complete documentation",
  "before_data": { ... },
  "after_data": { ... },
  "created_at": "2024-01-15T14:30:00Z"
}
```

### Enhanced Audit Log (After)

```json
{
  "id": 1234,
  "action": "edit",
  "entity_type": "task",
  "entity_id": 123,
  "summary": "Complete documentation - Status: \"in-progress\" → \"done\"; Priority: \"medium\" → \"high\"; Time Spent: \"1h\" → \"2h 30min\"",
  "before_data": {
    "id": 123,
    "title": "Complete documentation",
    "status": "in-progress",
    "priority": "medium",
    "time_spent_minutes": 60,
    "completed": 0
  },
  "after_data": {
    "id": 123,
    "title": "Complete documentation",
    "status": "done",
    "priority": "high",
    "time_spent_minutes": 150,
    "completed": 1
  },
  "changeDetails": {
    "summary": "Status: \"in-progress\" → \"done\"; Priority: \"medium\" → \"high\"; Time Spent: \"1h\" → \"2h 30min\"",
    "fullSummary": "Status: \"in-progress\" → \"done\"; Priority: \"medium\" → \"high\"; Time Spent: \"1h\" → \"2h 30min\"; Completed: \"No\" → \"Yes\"",
    "changeCount": 4,
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
      },
      {
        "field": "time_spent_minutes",
        "label": "Time Spent",
        "before": "1h",
        "after": "2h 30min"
      },
      {
        "field": "completed",
        "label": "Completed",
        "before": "No",
        "after": "Yes"
      }
    ]
  },
  "created_at": "2024-01-15T14:30:00Z"
}
```

### UI Display

```
┌──────────────────────────────────────────────────────────────┐
│ 🔧 John Doe edited task #123                                 │
│ Complete documentation                                        │
│                                                               │
│ 📝 Changes (4):                                              │
│ • Status: "in-progress" → "done"                             │
│ • Priority: "medium" → "high"                                │
│ • Time Spent: "1h" → "2h 30min"                              │
│ • Completed: "No" → "Yes"                                    │
│                                                               │
│ 📅 Jan 15, 2024, 02:30 PM                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Example 2: User Profile Update

### Data

**Before:**

```json
{
  "id": 5,
  "username": "john.doe",
  "email": "john@example.com",
  "name": "John Doe",
  "timezone": "America/New_York",
  "account_status": "active"
}
```

**After:**

```json
{
  "id": 5,
  "username": "john.doe",
  "email": "john.newemail@example.com",
  "name": "John D. Doe",
  "timezone": "America/Los_Angeles",
  "account_status": "active"
}
```

### Enhanced Summary

```
"john.doe - Email: \"john@example.com\" → \"john.newemail@example.com\"; Full Name: \"John Doe\" → \"John D. Doe\"; Timezone: \"America/New_York\" → \"America/Los_Angeles\""
```

### UI Display

```
┌──────────────────────────────────────────────────────────────┐
│ 👤 John Doe edited user #5                                   │
│ john.doe                                                      │
│                                                               │
│ 📝 Changes (3):                                              │
│ • Email: "john@example.com" → "john.newemail@example.com"   │
│ • Full Name: "John Doe" → "John D. Doe"                     │
│ • Timezone: "America/New_York" → "America/Los_Angeles"      │
│                                                               │
│ 📅 Jan 15, 2024, 03:45 PM                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Example 3: Transaction Update

### Data

**Before:**

```json
{
  "id": 456,
  "amount": 49.99,
  "merchant": "Amazon",
  "category": "Shopping",
  "transaction_date": "2024-01-10",
  "description": "Books"
}
```

**After:**

```json
{
  "id": 456,
  "amount": 52.49,
  "merchant": "Amazon",
  "category": "Education",
  "transaction_date": "2024-01-10",
  "description": "Technical books for learning"
}
```

### Enhanced Summary

```
"Amazon - Amount: \"$49.99\" → \"$52.49\"; Category: \"Shopping\" → \"Education\"; Description: \"Books\" → \"Technical books for learning\""
```

### UI Display

```
┌──────────────────────────────────────────────────────────────┐
│ 💳 Jane Smith edited transaction #456                        │
│ Amazon                                                        │
│                                                               │
│ 📝 Changes (3):                                              │
│ • Amount: "$49.99" → "$52.49"                                │
│ • Category: "Shopping" → "Education"                         │
│ • Description: "Books" → "Technical books for learning"      │
│                                                               │
│ 📅 Jan 15, 2024, 04:15 PM                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Example 4: Field Value Changes

### Setting a Value (Empty → Value)

```
Reminder: set to "Jan 20, 2024, 09:00 AM"
```

### Clearing a Value (Value → Empty)

```
Comment: cleared (was "This is outdated")
```

### Boolean Changes

```
Archived: "No" → "Yes"
Completed: "No" → "Yes"
Is Admin: "No" → "Yes"
```

### Date Changes

```
Due Date: "Jan 15, 2024" → "Jan 20, 2024"
Reminder: "Jan 15, 2024, 09:00 AM" → "Jan 15, 2024, 02:00 PM"
```

### Amount Changes

```
Balance: "$1,234.56" → "$1,500.00"
Amount: "$49.99" → "$52.49"
```

### Time Duration Changes

```
Time Spent: "1h 30min" → "2h 45min"
Time Spent: "45 min" → "1h 15min"
Time Spent: "30 min" → "1h"
```

---

## Example 5: Complex Update with Many Fields

### Data

**Before:**

```json
{
  "title": "Review Q4 Report",
  "description": "Review and provide feedback on Q4 financial report",
  "status": "todo",
  "priority": "low",
  "tag": "work",
  "comment": "",
  "time_spent_minutes": 0,
  "reminder_at": null,
  "archived": 0,
  "completed": 0
}
```

**After:**

```json
{
  "title": "Review Q4 Financial Report",
  "description": "Review and provide detailed feedback on Q4 financial report including revenue analysis",
  "status": "in-progress",
  "priority": "high",
  "tag": "finance",
  "comment": "Started review, found discrepancy in revenue figures",
  "time_spent_minutes": 45,
  "reminder_at": "2024-01-16T10:00:00Z",
  "archived": 0,
  "completed": 0
}
```

### Enhanced Summary (First 3 fields)

```
"Review Q4 Financial Report - Title: \"Review Q4 Report\" → \"Review Q4 Financial Report\"; Description: \"Review and provide...\" → \"Review and provide...\"; Status: \"todo\" → \"in-progress\"; and 5 more fields"
```

### Full Change Details

```
┌──────────────────────────────────────────────────────────────┐
│ 📋 Sarah Johnson edited task #789                            │
│ Review Q4 Financial Report                                    │
│                                                               │
│ 📝 Changes (8):                                              │
│ • Title: "Review Q4 Report" → "Review Q4 Financial Report"  │
│ • Description: "Review and provide feedback..." →            │
│   "Review and provide detailed feedback..."                  │
│ • Status: "todo" → "in-progress"                             │
│ • Priority: "low" → "high"                                   │
│ • Tag: "work" → "finance"                                    │
│ • Comment: set to "Started review, found discrepancy..."     │
│ • Time Spent: set to "45 min"                                │
│ • Reminder: set to "Jan 16, 2024, 10:00 AM"                  │
│                                                               │
│ 📅 Jan 15, 2024, 05:30 PM                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Example 6: Admin Actions

### User Status Change

```
┌──────────────────────────────────────────────────────────────┐
│ 🛡️ Admin edited user #42                                     │
│ jane.smith                                                    │
│                                                               │
│ 📝 Changes (1):                                              │
│ • Account Status: "active" → "disabled"                      │
│                                                               │
│ 👤 Actor: admin (ID: 1)                                      │
│ 📅 Jan 15, 2024, 06:00 PM                                    │
└──────────────────────────────────────────────────────────────┘
```

### Admin Privilege Grant

```
┌──────────────────────────────────────────────────────────────┐
│ 🛡️ Admin edited user #15                                     │
│ mike.wilson                                                   │
│                                                               │
│ 📝 Changes (1):                                              │
│ • Admin Status: "No" → "Yes"                                 │
│                                                               │
│ 👤 Actor: admin (ID: 1)                                      │
│ 📅 Jan 15, 2024, 06:15 PM                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Example 7: Impersonation

When an admin impersonates a user:

```
┌──────────────────────────────────────────────────────────────┐
│ 🎭 John Doe (impersonated) edited task #999                  │
│ Fix critical bug                                              │
│                                                               │
│ 📝 Changes (1):                                              │
│ • Priority: "medium" → "urgent"                              │
│                                                               │
│ 👤 User: john.doe (ID: 5)                                    │
│ 🎭 Impersonator: admin (ID: 1)                               │
│ 📅 Jan 15, 2024, 07:00 PM                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Example 8: Bulk Changes (Multiple Fields)

### Large Update Summary

When more than 5 fields change, show first 3 + count:

```
"Update project settings - Name: \"Old Name\" → \"New Name\"; Description: \"...\" → \"...\"; Status: \"active\" → \"archived\"; and 7 more fields"
```

### Expandable UI

```
┌──────────────────────────────────────────────────────────────┐
│ ⚙️ Admin edited project #50                                  │
│ Update project settings                                       │
│                                                               │
│ 📝 Changes (10): [Show all ▼]                                │
│ • Name: "Old Project" → "New Project Name"                   │
│ • Description: "..." → "..."                                  │
│ • Status: "active" → "archived"                              │
│ • and 7 more...                                              │
│                                                               │
│ [Click to expand full change list]                           │
│                                                               │
│ 📅 Jan 15, 2024, 07:30 PM                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Example 9: Timeline View

### Entity History Timeline

```
Task #123 - "Complete documentation"

┌──────────────────────────────────────────────────────────────┐
│ 🎯 Created by John Doe                                        │
│ Priority: "medium", Status: "todo"                            │
│ 📅 Jan 10, 2024, 10:00 AM                                    │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 🔧 Edited by John Doe                                         │
│ Status: "todo" → "in-progress"                                │
│ 📅 Jan 12, 2024, 02:15 PM                                    │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 🔧 Edited by John Doe                                         │
│ Time Spent: empty → "1h 30min"                                │
│ Comment: set to "Working on implementation"                   │
│ 📅 Jan 13, 2024, 04:30 PM                                    │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 🔧 Edited by John Doe                                         │
│ Status: "in-progress" → "done"                                │
│ Priority: "medium" → "high"                                   │
│ Time Spent: "1h 30min" → "2h 30min"                           │
│ Completed: "No" → "Yes"                                       │
│ 📅 Jan 15, 2024, 02:30 PM                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Example 10: Search & Filter

### Search Results

```
Search: "status done"

Found 5 results:

1. Task #123: Status: "in-progress" → "done"
2. Task #456: Status: "todo" → "done"
3. Task #789: Status: "in-progress" → "done", Priority: "low" → "high"
4. Task #012: Status: "todo" → "done"
5. Task #345: Status: "in-progress" → "done", Time Spent: "1h" → "3h"
```

### Filter by Entity Type

```
Filter: entity_type = "task", action = "edit"

Showing 25 results:

• Task #999: Priority: "low" → "urgent"
• Task #888: Status: "todo" → "in-progress"
• Task #777: Archived: "No" → "Yes"
...
```

---

## Implementation Code

### Backend Usage

```javascript
// In your route handler
router.put(
  '/tasks/:id',
  asyncHandler(async (req, res) => {
    const oldTask = await tasksService.getTask(id);
    const newTask = await tasksService.updateTask(id, req.body);

    // Log with automatic change detection
    await logUpdate({
      auditLogs,
      req,
      entityType: 'task',
      entityId: newTask.id,
      summary: newTask.title,
      before: oldTask,
      after: newTask,
    });

    sendSuccess(res, { task: newTask });
  }),
);
```

### Frontend Usage

```javascript
// Fetch audit logs
const response = await fetch('/api/audit-logs?entityType=task&limit=20');
const data = await response.json();

// Display changes
data.logs.forEach((log) => {
  console.log(`${log.actor_username} ${log.action} ${log.entity_type} #${log.entity_id}`);
  console.log(`Summary: ${log.summary}`);

  if (log.changeDetails) {
    console.log(`Changes (${log.changeDetails.changeCount}):`);
    log.changeDetails.changes.forEach((change) => {
      console.log(`  • ${change.label}: "${change.before}" → "${change.after}"`);
    });
  }
});
```

---

**These examples demonstrate the comprehensive change tracking now available in your audit logs!** 🎉
