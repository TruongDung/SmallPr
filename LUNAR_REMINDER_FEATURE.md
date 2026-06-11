# Lunar Calendar Reminder Feature

## Overview

Lunar Calendar Reminders create system-generated task reminders before important Vietnamese lunar calendar dates:

- Lunar Day 1 (Mùng 1)
- Lunar Day 15 (Ngày Rằm)

Each user can enable the feature, choose how many days before the lunar date to create the reminder, choose which lunar days are important, and decide whether lunar labels are shown in the React calendar month view.

## Data Model

Migration: `src/server/db/migrations/025_create_lunar_reminders.sql`

Task metadata:

- `type`: `NORMAL` or `LUNAR_REMINDER`
- `is_system_generated`
- `lunar_day`
- `lunar_month`
- `lunar_year`
- `reminder_date`
- `lunar_event_date`

User settings:

- `enable_lunar_reminder`
- `reminder_days_before`
- `remind_lunar_day1`
- `remind_lunar_day15`
- `show_lunar_dates_in_calendar`

User timezone is stored on `users.timezone` and is editable from the React settings screen.

Duplicate prevention is enforced by a unique index on user, task type, lunar day, and reminder date for `LUNAR_REMINDER` tasks.

## Backend

Services:

- `LunarCalendarService`: converts Gregorian dates to Vietnamese lunar dates, including leap lunar months, and returns month labels.
- `UserSettingsService`: persists reminder/calendar settings.
- `TaskCreationService`: creates system-generated lunar reminder tasks and prevents duplicates.
- `LunarReminderScheduler`: runs reminder generation and schedules the next daily 00:05 run.

Routes:

- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/lunar-calendar/month?year=YYYY&month=M`

The scheduler calculates the user's current date in their configured timezone, adds `reminder_days_before`, converts the target date to the Vietnamese lunar calendar, and creates a reminder only when the target date is Lunar Day 1 or Lunar Day 15 and that day is enabled.

## React UI

React additions:

- Settings tab with lunar reminder controls.
- User timezone control for timezone-aware reminder generation.
- Calendar tab with month view.
- Lunar date labels in month cells when enabled.

The React calendar fetches month lunar labels from the backend so server and client use the same conversion path.

## Tests

Covered by:

- `src/server/services/lunarCalendar.service.test.js`
- `src/server/services/lunarReminderScheduler.service.test.js`
- `src/server/services/lunarReminder.integration.test.js`

Coverage includes conversion, leap lunar month parsing, timezone differences, year transitions, reminder generation, duplicate prevention, scheduler execution, scheduler rerun duplicate behavior, and database insertion.
