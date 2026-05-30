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
```

Set `TASK_ALERT_TO` only when task alerts should go to a fallback recipient. Set `DEFAULT_ADMIN_PASSWORD` only when bootstrapping a fresh database that does not already have an admin user.

5. To automatically star and label task alert emails in Gmail, create a Gmail filter in ``:

- Search query: `from:<sender-email> "Task Manager"`
- Filter actions: `Star it` and `Apply the label: Task Manager`

The app adds `Task Manager` to every Add Task email body and header so the filter can reliably find it without adding `[Task Manager]` to the email title.

6. Open http://localhost:3000 in your browser.

7. Test link: https://small-pr.vercel.app/

## iOS App

An iOS wrapper project is available at `ios/TaskManager/TaskManager.xcodeproj`.

Open it in Xcode on a Mac, set your Apple signing team, connect your iPhone, and press Run. The app loads the deployed Task Manager URL from `ios/TaskManager/TaskManager/AppConfig.swift`.

## Default Credentials

- Username: `admin`
- Password: `admin`

You can use these credentials to log in, or create a new account via the signup form.

## Test
