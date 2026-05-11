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

3. To send an email alert when a task is added, set these environment variables before starting the app:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
TASK_ALERT_TO=truongdung0502@gmail.com
```

`TASK_ALERT_TO` defaults to `truongdung0502@gmail.com` if it is not set.

4. To automatically star and label task alert emails in Gmail, create a Gmail filter in `truongdung0502@gmail.com`:

- Search query: `from:muonkiepnhansinh1@gmail.com subject:TaskManager`
- Filter actions: `Star it` and `Apply the label: TaskManager`

The app adds `TaskManager` to every Add Task email subject and body so the filter can reliably find it.

5. Open http://localhost:3000 in your browser.

## Default Credentials

- Username: `admin`
- Password: `a123456789`

You can use these credentials to log in, or create a new account via the signup form.
