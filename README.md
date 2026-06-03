# Task Management App

A simple Node.js task management application with user authentication.

## Features

- User signup and login
- Session-based authentication
- Create, read, update, delete tasks
- Task completion tracking

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm start
```

3. Configure Supabase Postgres in `.env`:

```bash
DATABASE_URL=postgresql://postgres:<url-encoded-password>@db.your-project-ref.supabase.co:5432/postgres
```

If your password contains special characters like `#` or `@`, URL-encode them before putting the password in `DATABASE_URL`.

Optional Redis caching can be enabled with:

```bash
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=30
```

Redis is used for short-lived server-side dashboard cache entries. If Redis is not configured or temporarily unavailable, the app falls back to Postgres reads and keeps running.

4. To send an email alert when a task is added, set these environment variables before starting the app:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<smtp-username>
SMTP_PASS=<smtp-password>
MAIL_FROM=<sender-email>
TASK_ALERT_TO=<recipient-email>
DEFAULT_ADMIN_PASSWORD=<admin-password>
PUBLIC_SENTRY_DSN=<sentry-browser-dsn>
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=<release-name>
PUBLIC_POSTHOG_API_KEY=<posthog-project-api-key>
PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
LOG_LEVEL=info
BETTER_STACK_SOURCE_TOKEN=<better-stack-source-token>
BETTER_STACK_ENDPOINT=https://in.logs.betterstack.com
```

Set `TASK_ALERT_TO` only when task alerts should go to a fallback recipient. Set `DEFAULT_ADMIN_PASSWORD` only when bootstrapping a fresh database that does not already have an admin user.
Set the Sentry and PostHog variables only when frontend monitoring and analytics should be enabled.
Set `BETTER_STACK_SOURCE_TOKEN` only when backend logs should be forwarded to Better Stack. Without it, Pino writes structured JSON logs to stdout.

5. Backend uptime monitoring:

- Liveness endpoint: `GET /healthz` returns `200` when the Node process is running.
- Readiness endpoint: `GET /readyz` returns dependency status and returns `503` if Postgres is unavailable.
- API alias: `GET /api/health` returns the same readiness payload for external monitors.
- Uptime Kuma: create an HTTP(s) monitor for `https://<your-domain>/readyz`, expect status `200`, and optionally add keyword `status`.
- Better Stack Uptime: create an HTTP monitor for `https://<your-domain>/readyz`; use the same Better Stack project as logs if desired.

6. To automatically star and label task alert emails in Gmail, create a Gmail filter in ``:

- Search query: `from:<sender-email> "Task Manager"`
- Filter actions: `Star it` and `Apply the label: Task Manager`

The app adds `Task Manager` to every Add Task email body and header so the filter can reliably find it without adding `[Task Manager]` to the email title.

7. Open http://localhost:3000 in your browser.

8. Test link: https://small-pr.vercel.app/

## iOS App

An iOS wrapper project is available at `ios/TaskManager/TaskManager.xcodeproj`.

Open it in Xcode on a Mac, set your Apple signing team, connect your iPhone, and press Run. The app loads the deployed Task Manager URL from `ios/TaskManager/TaskManager/AppConfig.swift`.

## Default Credentials

- Username: `admin`
- Password: `admin`

You can use these credentials to log in, or create a new account via the signup form.


## Recommended Refactoring Priorities

### 1. Split `server.js` Immediately

`server.js` is currently handling database schema creation, migrations, seed data, email services, session management, Socket.IO, and route registration in a single file of approximately 1,194 lines.

It should be separated into:

- `app.js`
- `server.js`
- `db/migrations/*`
- `services/email/*`
- `services/auth/*`
- `routes/*`
- `middleware/*`

This will improve maintainability, testability, and overall project structure.

### 2. Use Proper Database Migrations Instead of Runtime Schema Changes

The application currently creates tables and alters the database schema during server startup.

A more maintainable approach is to use a dedicated migration framework such as:

- Knex
- Prisma
- Drizzle
- node-pg-migrate

This provides clear schema versioning, safer deployments, and easier rollback capabilities.

### 3. Standardize the Database Layer

The current `client.js` converts `?` placeholders into `$1`, `$2`, etc. to emulate SQLite-style queries on PostgreSQL.

A better approach is to use native PostgreSQL parameterized queries consistently or adopt an ORM/query builder. This reduces hidden complexity and makes database issues easier to debug.

### 4. Move Validation Out of Route Handlers

`tasks.routes.js` is currently responsible for validation, business logic execution, email notifications, and real-time event emission.

Validation should be extracted into dedicated schema files using a validation library such as:

- Zod
- Joi

For example:

- `task.schema.js`
- `task.service.js`
- `task.controller.js`

Routes should focus only on request orchestration.

### 5. Modularize the Frontend

`public/index.html` has grown significantly and currently contains functionality for dashboards, notes, tasks, weather, exports, modals, finance, and more.

Consider migrating the frontend to React + Vite. If a full migration is not yet feasible, split the codebase into modules such as:

- `tasks.js`
- `notes.js`
- `dashboard.js`
- `finance.js`
- `apiClient.js`

This will improve code organization, readability, and long-term scalability.
