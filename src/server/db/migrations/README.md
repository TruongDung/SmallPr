# Database Migrations

This folder contains all PostgreSQL schema migrations for the application.

## How it works

Migrations are applied automatically at startup by `src/server/db/initialize.js`, which
calls `runMigrations()` from `src/server/db/migrationRunner.js`. The runner:

1. Lists all `.sql` files in this directory in alphabetical order
2. Skips any migration already recorded in the `schema_migrations` table
3. Runs each new migration inside a transaction
4. Records the migration filename on success, or rolls back on failure

## Naming convention

| Prefix | Pattern | Example |
|--------|---------|---------|
| `001`–`011` | `NNN_create_<entity>.sql` | `001_create_users.sql` |
| `012`–`017` | `NNN_<action>_<entity>.sql` | `012_add_notes_pinned.sql` |

Files are sorted by name, so the numeric prefix determines execution order.

## Adding a new migration

Create a new `.sql` file with the next available sequence number:

```sql
-- 018_add_user_avatar.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

Use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so migrations are idempotent and
safe to re-run on databases that may already have the change.

## Migration order

| File | Description |
|------|-------------|
| `001_create_users.sql` | Core users table |
| `002_create_tasks.sql` | Tasks and task_tags tables |
| `003_create_transactions.sql` | Transactions table |
| `004_create_credit_cards.sql` | Credit cards table + FK from transactions |
| `005_create_weather_cities.sql` | Weather cities table |
| `006_create_fast_access_bills.sql` | Fast access bills table |
| `007_create_fast_access_bill_defaults.sql` | Fast access bill defaults table |
| `008_create_fast_access_links.sql` | Fast access links table |
| `009_create_notes.sql` | Notes table |
| `010_create_note_versions.sql` | Note versions table (history) |
| `011_create_notes_search_index.sql` | Full-text search index on notes |
| `012_add_notes_pinned.sql` | Pinned column on notes |
| `013_add_email_verification.sql` | Email verification columns on users |
| `014_create_audit_logs.sql` | Audit logs table |
| `015_add_audit_logs_search.sql` | Full-text search index on audit_logs |
| `016_relax_transaction_constraints.sql` | Relax NOT NULL on transaction text fields |
| `017_data_initialization.sql` | Seed default fast access bills and task tags |
