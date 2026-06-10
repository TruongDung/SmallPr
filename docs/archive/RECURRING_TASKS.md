# Recurring Tasks

Recurring tasks let users create a task once and have future task instances generated automatically from a schedule. The implementation is database-backed, idempotent, timezone-aware, and runs from a background worker instead of relying on user requests.

## User-Facing Behavior

Users can configure a task to repeat:

- Daily
- Weekly
- Monthly
- Yearly
- At custom intervals, such as every 3 days or every 2 weeks

Supported recurrence options:

- Frequency
- Interval
- Start date, stored from the task due date
- End date
- Number of occurrences
- Specific weekdays for weekly rules
- Timezone

Users can also pause and resume a recurring series from a recurring task card.

## Architecture

The recurring task system is split across these layers:

```text
Scheduler
  -> Recurring task worker
  -> Recurrence service
  -> recurring_task_rules + tasks
  -> Audit logs
  -> Task notification email
```

Key files:

- `src/server/db/migrations/021_create_recurring_task_rules.sql`
- `src/server/services/recurrence.service.js`
- `src/server/workers/recurringTask.worker.js`
- `src/server/routes/tasks.routes.js`
- `src/server/services/tasks.service.js`
- `src/server/schemas/task.schema.js`
- `public/app.js`
- `public/index.html`
- `public/js/tasks.js`

## Data Model

Recurring schedules are stored in `recurring_task_rules`.

Important columns:

- `frequency`: `daily`, `weekly`, `monthly`, or `yearly`
- `interval`: repeat interval, always greater than zero
- `start_date`: first scheduled date
- `end_date`: optional cutoff date
- `occurrence_limit`: optional maximum number of generated occurrences
- `weekdays`: integer array for weekly recurrence, Sunday `0` through Saturday `6`
- `timezone`: IANA timezone such as `America/New_York` or `Asia/Ho_Chi_Minh`
- `status`: `active`, `paused`, or `deleted`
- `generated_count`: count of generated occurrences, including the initial task
- `next_due_date`: next date the worker should generate
- `last_generated_due_date`: most recent generated due date

Tasks have recurrence metadata:

- `recurring_rule_id`
- `recurrence_occurrence_index`
- `recurrence_timezone`
- `recurrence_end_date`
- `recurrence_occurrence_limit`
- Existing compatibility fields: `is_recurring`, `recurrence_pattern`, `recurrence_interval`, `recurrence_days`, `next_occurrence_date`

Duplicate prevention is enforced with:

- `tasks_recurring_rule_due_date_idx`: unique task per recurrence rule and due date
- Worker-safe update logic in `recurrence.service.js`

## Generation Flow

1. A user creates a recurring task with a due date.
2. The task is inserted normally.
3. `tasks.routes.js` creates a `recurring_task_rules` row for the task.
4. `recurringTask.worker.js` runs periodically after database startup.
5. The worker asks `recurrence.service.js` for due active rules.
6. For each due rule, the service inserts the next task instance.
7. If the same job retries, the unique index prevents duplicate task creation.
8. The rule advances `generated_count`, `last_generated_due_date`, and `next_due_date`.
9. An audit log is recorded for newly generated tasks.
10. A task notification email is sent when email settings are available.

Recurring task generation is not triggered by marking a task as done. It is handled by the background worker so missed schedules can be caught up independently of user activity.

## Timezone Handling

The worker compares each rule's `next_due_date` against "today" in that rule's timezone. This prevents a schedule in `Asia/Ho_Chi_Minh` from being evaluated as if it were in the server timezone.

The system validates timezones with `Intl.DateTimeFormat`. Invalid recurrence timezones are rejected by request validation.

Calendar arithmetic is done on local date strings (`YYYY-MM-DD`) so monthly and yearly schedules preserve calendar intent:

- Monthly schedules clamp to the last valid day when needed.
- Yearly schedules reuse monthly arithmetic to handle leap-year dates.
- Weekly schedules use selected weekday integers.

## API Behavior

Create a recurring task:

```http
POST /api/tasks
```

Relevant payload fields:

```json
{
  "title": "Pay Rent",
  "due_date": "2026-06-01",
  "is_recurring": true,
  "recurrence_pattern": "monthly",
  "recurrence_interval": 1,
  "recurrence_timezone": "America/New_York",
  "recurrence_end_date": null,
  "recurrence_occurrence_limit": null
}
```

Update recurrence metadata:

```http
PUT /api/tasks/:id
```

Pause, resume, or delete a recurrence rule:

```http
POST /api/tasks/:id/recurrence/pause
POST /api/tasks/:id/recurrence/resume
POST /api/tasks/:id/recurrence/delete
```

Deleting a recurrence rule marks it as deleted and clears recurrence linkage from its tasks.

## Audit Logging

The audit log service supports recurrence-specific actions:

- `recurrence_created`
- `recurrence_updated`
- `recurrence_paused`
- `recurrence_resumed`
- `recurrence_deleted`
- `task_auto_generated`

Recurring rule audit events use `entity_type = recurrence`. Auto-generated tasks use `entity_type = task`.

## Notifications

When the worker creates a new task instance, it calls `sendTaskAlertEmail` if email settings are configured and the user can be loaded. Notification failures are logged but do not roll back task generation.

## Frontend

The task form supports:

- Frequency selector: daily, weekly, monthly, yearly
- Interval input with dynamic unit label
- Weekday selector for weekly rules
- Timezone input using the existing timezone datalist
- End date
- Occurrence limit

Recurring task cards show a recurrence badge. Paused recurring tasks show a paused badge and expose a resume action. Active recurring tasks expose a pause action.

## Testing

Focused recurrence coverage lives in `server.test.js`:

```bash
npx jest server.test.js --runInBand -t "creates recurring rules"
```

This test verifies:

- API task creation creates a recurrence rule.
- The next due date is calculated.
- The service generates the next task instance.
- Retrying generation does not create a duplicate task.
- Rule counters advance safely.

The full test file can be run with:

```bash
npx jest server.test.js --runInBand
```

Note: the full suite includes dashboard tests that may log quote-provider network warnings when external quote APIs are unavailable. Those warnings are unrelated to recurring task generation.

## Operational Notes

The worker starts in `app.js` after `dbReady` unless:

```text
NODE_ENV=test
DISABLE_RECURRING_TASK_WORKER=true
```

The worker interval defaults to 60 seconds. It uses an in-process lock so a slow run cannot overlap with the next scheduled run.

For horizontally scaled deployments, keep the database uniqueness constraints in place. They are the final duplicate-protection layer if more than one worker process attempts to generate the same occurrence.

## Current Scope

Implemented:

- Daily, weekly, monthly, yearly recurrence
- Custom intervals
- Timezone validation and timezone-aware due checks
- End date and occurrence count
- Pause, resume, and delete recurrence rule actions
- Background worker generation
- Duplicate prevention
- Audit logging
- Notification hook for generated tasks

Not implemented yet:

- A dedicated series-management screen
- Bulk editing all future task content from a separate UI flow
- Catch-up generation of multiple missed occurrences in a single worker pass
