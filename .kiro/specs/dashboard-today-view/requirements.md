# Requirements Document

## Introduction

The Dashboard / Today View feature introduces a single landing view that aggregates the most important information across the existing self-contained sections of the Task Manager app (Tasks, Notes, Financial → Credit Cards, Financial → Fast-access Bills, Weather, Daily Quote). The Dashboard does not replace any existing section. It complements them by surfacing what needs the user's attention "today" and providing quick navigation and quick-create shortcuts back into each section.

The Dashboard is delivered as part of the existing Node.js/Express + Postgres (Supabase) PWA, rendered inside the existing iOS WKWebView wrapper, and reuses the existing per-user Socket.IO rooms for real-time updates. The Dashboard supports the existing en/vi locale switcher, dark mode, and iOS-friendly UI conventions (44pt minimum touch targets, dvh viewport units, sticky headers with backdrop-blur).

This document captures the feature's user-visible behavior using EARS acceptance criteria. Open product decisions are listed in the "Assumptions and Open Questions" section at the end of the document and are reflected as explicit defaults in the criteria below; the user can adjust those defaults during requirements review.

## Glossary

- **Dashboard**: The aggregated landing view introduced by this feature. Synonymous with "Today View" in the UI.
- **Today_View**: User-facing label for the Dashboard, rendered in the active locale (English: "Today"; Vietnamese: "Hôm nay").
- **Card**: A self-contained, bordered region on the Dashboard that summarizes data from one source section (for example, Today's Tasks Card, Bills Card, Weather Card).
- **User**: An authenticated account holder of the Task Manager app.
- **User_Timezone**: The IANA time zone resolved from the user's browser at render time using `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Today_Window**: The interval `[start_of_day, end_of_day)` in the User_Timezone for the current local date.
- **This_Week_Window**: The interval `[start_of_today, start_of_today + 7 days)` in the User_Timezone.
- **Due_Soon_Window**: The interval `[start_of_today, start_of_today + 3 days)` in the User_Timezone, applied to bills and credit card closing dates. Default 3 days.
- **Task**: A row from the existing `tasks` table belonging to the current User. Relevant fields: `title`, `priority`, `status` (`todo` | `in_progress` | `done`), `tag`, `reminder_at`, `archived`, `time_spent_minutes`.
- **Note**: A row from the existing `notes` table belonging to the current User. Relevant fields: `title`, `body`, `updated_at`.
- **Bill**: A row from the existing `fast_access_bills` table belonging to the current User. Relevant fields: `item`, `amount`, `due_date`, `pay_before`, `status` (`Paid` | `Unpaid`).
- **Credit_Card**: A row from the existing `credit_cards` table belonging to the current User. Relevant fields: `name`, `total_balance`, `interest_charge`, `closing_date`.
- **Weather_City**: A user-saved city in the existing Weather section. Each User has zero or more Weather_City rows.
- **Primary_City**: The Weather_City the User has explicitly marked as primary, or, when none is marked, the Weather_City with the lowest sort order.
- **Daily_Quote**: The quote returned by the existing Daily Quote source for the current local date.
- **Socket_Channel**: The existing per-user Socket.IO room (`user:{userId}`) over which the server emits domain change events.
- **Dashboard_API**: The new HTTP endpoint that returns the aggregated Dashboard payload for the current User.
- **Dashboard_Preferences**: A per-User record persisting which Cards are visible, the Card display order, and the User's choice of default landing view.
- **Quick_Action**: A button on the Dashboard that creates a new Task or Note inline without leaving the Dashboard.
- **Inline_Preview**: An expandable panel on a Card that shows additional summary detail without navigating away from the Dashboard.
- **Empty_State**: The localized placeholder content rendered by a Card when the underlying section has no data to surface.

## Requirements

### Requirement 1: Dashboard Navigation and Default Landing

**User Story:** As a User, I want a dedicated Today tab as the default landing view after login, so that I see what needs my attention without tab-hopping.

#### Acceptance Criteria

1. THE Task_Manager_App SHALL render a top-level navigation entry labeled "Today" in English and "Hôm nay" in Vietnamese that opens the Dashboard.
2. WHEN a User signs in successfully and the User has not changed the default landing view preference, THE Task_Manager_App SHALL render the Dashboard as the initial view, regardless of deep-link state, prior session restoration, or error recovery routes.
3. WHERE the User has set the default landing view preference to "last used", THE Task_Manager_App SHALL render the section that was active at the end of the User's previous session as the initial view after sign-in.
4. WHERE the User has set the default landing view preference to "last used" and the previous session ended on the Dashboard, THE Task_Manager_App SHALL render the Dashboard with the same UI affordances as the default-preference behavior and SHALL NOT display any indicator describing which preference rule was applied.
5. WHEN a User taps the "Today" navigation entry from any section, THE Task_Manager_App SHALL navigate to the Dashboard without reloading the page.
6. THE Dashboard SHALL preserve the active locale, theme, and authentication state of the rest of the application.

### Requirement 2: Aggregated Dashboard Data Fetch

**User Story:** As a User, I want the Dashboard to load all of its summary data in a single request, so that the page feels fast and the Cards appear together.

#### Acceptance Criteria

1. WHEN the Dashboard mounts, THE Task_Manager_App SHALL issue exactly one request to the Dashboard_API to fetch the aggregated payload for the authenticated User.
2. THE Dashboard_API SHALL return, in one response, the data needed for: today's tasks, task status counts, recently updated notes, unpaid and due-soon bills, credit card totals and approaching closing dates, the Primary_City weather summary, and the Daily_Quote.
3. THE Dashboard_API SHALL scope every returned record to the authenticated User.
4. THE Dashboard_API SHALL accept the User_Timezone as a request parameter and SHALL compute Today_Window, This_Week_Window, and Due_Soon_Window in that time zone.
5. WHEN the User_Timezone parameter is missing or unrecognized, THE Dashboard_API SHALL fall back to UTC and SHALL include a `timezoneFallback: true` flag in the response.
6. WHILE the Dashboard_API request is in flight, THE Dashboard SHALL render a skeleton placeholder for each Card.
7. IF the Dashboard_API request fails with a network or 5xx error, THEN THE Dashboard SHALL render a Dashboard-level error banner with a "Retry" action and SHALL keep the navigation chrome usable.
8. IF an individual Card's section data is unavailable but the rest of the payload succeeds, THEN THE Dashboard SHALL render that Card in an error state with a "Retry" action while leaving the other Cards functional.

### Requirement 3: Today's Tasks Card

**User Story:** As a User, I want to see the tasks that need my attention today, so that I can decide what to work on next without opening the Tasks tab.

#### Acceptance Criteria

1. THE Todays_Tasks_Card SHALL display Tasks belonging to the current User where `archived` is false and at least one of the following is true:
   - `status` is `in_progress`.
   - `reminder_at` falls within Today_Window.
   - `reminder_at` is earlier than `start_of_today` and `status` is not `done` (overdue).
2. THE Todays_Tasks_Card SHALL group displayed Tasks under three labeled subsections in the following order: "Overdue", "Today", "In Progress".
3. THE Todays_Tasks_Card SHALL sort each subsection by `reminder_at` ascending, with Tasks lacking `reminder_at` sorted last by `priority` descending.
4. THE Todays_Tasks_Card SHALL show, for each Task, the title, priority indicator, tag (when present), and a localized due/reminder label.
5. THE Todays_Tasks_Card SHALL display at most 5 Tasks per subsection and SHALL render a "View all" link to the Tasks tab when more Tasks match.
6. WHEN the User taps a Task row, THE Task_Manager_App SHALL navigate to the Tasks tab and open that Task's detail view.
7. WHEN the User toggles a Task's completion control on the Card, THE Task_Manager_App SHALL update the Task's `status` to `done` and `completed` to true via the existing Tasks API and SHALL remove the Task from the Card on success.
8. IF the User has no matching Tasks, THEN THE Todays_Tasks_Card SHALL render the localized Empty_State "No tasks for today" with a Quick_Action button to add a Task.

### Requirement 4: Task Status Summary Card

**User Story:** As a User, I want to see how many tasks I have in each status, so that I can gauge my workload at a glance.

#### Acceptance Criteria

1. THE Task_Status_Summary_Card SHALL display three counts for the current User's non-archived Tasks: Todo, In Progress, and Done.
2. THE Task_Status_Summary_Card SHALL render each count with a localized label, the numeric value, and an icon consistent with the Tasks tab.
3. WHEN the User taps a status count, THE Task_Manager_App SHALL navigate to the Tasks tab pre-filtered to that status.
4. WHERE the User has zero Tasks across all statuses, THE Task_Status_Summary_Card SHALL render the localized Empty_State "No tasks yet" with a Quick_Action button to add a Task.
5. WHERE the User has at least one Task across any status, THE Task_Status_Summary_Card SHALL NOT render a Quick_Action button.

### Requirement 5: Recently Updated Notes Card

**User Story:** As a User, I want to see the notes I have edited most recently, so that I can jump back into work in progress.

#### Acceptance Criteria

1. THE Recent_Notes_Card SHALL display the 5 most recently updated Notes for the current User, ordered by `updated_at` descending.
2. THE Recent_Notes_Card SHALL show, for each Note, the `title`, a body excerpt of at most 120 characters with trailing ellipsis when truncated, and a localized relative-time label derived from `updated_at`.
3. WHEN the User taps a Note row, THE Task_Manager_App SHALL navigate to the Notes tab and open that Note in the editor.
4. THE Recent_Notes_Card SHALL render a "View all notes" link to the Notes tab.
5. WHERE a Note has no `title`, THE Recent_Notes_Card SHALL render the localized fallback label "Untitled note".
6. IF the User has no Notes, THEN THE Recent_Notes_Card SHALL render the localized Empty_State message "No notes yet" together with a Quick_Action button to create a Note as a single combined Empty_State.
7. WHERE the User has at least one Note, THE Recent_Notes_Card SHALL NOT render the Empty_State Quick_Action button.

### Requirement 6: Bills Attention Card

**User Story:** As a User, I want to see which bills are unpaid or due soon, so that I do not miss a payment.

#### Acceptance Criteria

1. THE Bills_Card SHALL display Bills belonging to the current User where `status` equals `Unpaid` and at least one of the following is true:
   - `due_date` falls within Due_Soon_Window.
   - `due_date` is earlier than `start_of_today` (overdue).
   - `due_date` is null (undated unpaid bills).
2. THE Bills_Card SHALL group displayed Bills under labeled subsections in the following order: "Overdue", "Due soon", "Undated".
3. THE Bills_Card SHALL sort each dated subsection by `due_date` ascending.
4. THE Bills_Card SHALL show, for each Bill, the `item`, the `amount` formatted in the active locale, the `due_date` rendered as a localized short date, and the `pay_before` label when present.
5. THE Bills_Card SHALL display at most 5 Bills and SHALL render a "View all bills" link to the Financial → Fast-access Bills section when more Bills match.
6. WHEN the User taps a Bill row, THE Task_Manager_App SHALL navigate to the Financial → Fast-access Bills section and scroll that Bill into view.
7. WHEN the User taps the "Mark paid" control on a Bill row, THE Task_Manager_App SHALL update that Bill's `status` to `Paid` via the existing Bills API and SHALL remove it from the Card on success.
8. IF no Bills match the criteria, THEN THE Bills_Card SHALL render the localized Empty_State "No bills need attention".

### Requirement 7: Credit Cards Snapshot Card

**User Story:** As a User, I want a snapshot of my credit card balances and upcoming closing dates, so that I can plan payments before statements close.

#### Acceptance Criteria

1. THE Credit_Cards_Card SHALL display the grand total of `total_balance` across all Credit_Cards belonging to the current User, formatted in the active locale.
2. THE Credit_Cards_Card SHALL display the grand total of `interest_charge` across all of the User's Credit_Cards, formatted in the active locale.
3. THE Credit_Cards_Card SHALL list every Credit_Card whose `closing_date` falls within Due_Soon_Window, ordered by `closing_date` ascending, showing `name`, formatted `total_balance`, and a localized "Closes in N days" label.
4. WHEN the User taps the totals area or a closing-date row, THE Task_Manager_App SHALL navigate to the Financial → Credit Cards section.
5. WHERE the User has no Credit_Cards, THE Credit_Cards_Card SHALL render the localized Empty_State "No credit cards added".
6. WHERE the User has Credit_Cards but none are within Due_Soon_Window, THE Credit_Cards_Card SHALL render the totals area showing both the grand total of `total_balance` and the grand total of `interest_charge`, and SHALL render the localized message "No closing dates approaching" in place of the closing list.

### Requirement 8: Weather Card

**User Story:** As a User, I want to see the current weather for my primary saved city, so that I can plan my day.

#### Acceptance Criteria

1. THE Weather_Card SHALL display the current weather summary for the User's Primary_City, including city name, current temperature in the User's preferred units, weather condition label, and condition icon.
2. THE Weather_Card SHALL reuse the existing Weather section's data source and unit preference; the Dashboard SHALL NOT introduce a new weather provider.
3. WHEN the User taps the Weather_Card, THE Task_Manager_App SHALL navigate to the Weather tab and select the Primary_City.
4. WHERE the User has no saved Weather_City, THE Weather_Card SHALL render the localized Empty_State "Add a city in Weather" with a navigation link to the Weather tab.
5. WHERE the User has at least one saved Weather_City but the Primary_City designation is missing or invalid, THE Weather_Card SHALL select the Weather_City with the lowest sort order as the Primary_City and SHALL NOT render the Empty_State.
6. IF the upstream weather data fetch fails, THEN THE Weather_Card SHALL render the localized error message "Weather unavailable" with a "Retry" action and SHALL NOT block other Cards from rendering.

### Requirement 9: Daily Quote Card

**User Story:** As a User, I want to see the daily quote on my Dashboard, so that I get a small moment of inspiration each day.

#### Acceptance Criteria

1. THE Daily_Quote_Card SHALL display the Daily_Quote text and attribution returned by the existing Daily Quote source for the current local date.
2. THE Daily_Quote_Card SHALL reuse the existing Daily Quote backend; the Dashboard SHALL NOT introduce a new quote source.
3. WHEN the local date in User_Timezone changes, THE Daily_Quote_Card SHALL refresh to display the quote for the new date immediately upon the date transition without waiting for a User interaction.
4. IF the Daily Quote fetch fails, THEN THE Daily_Quote_Card SHALL render the localized fallback "Quote unavailable" without blocking other Cards.

### Requirement 10: Quick Actions

**User Story:** As a User, I want to add a task or a note directly from the Dashboard, so that I can capture work without switching tabs.

#### Acceptance Criteria

1. THE Dashboard SHALL render two persistent Quick_Action controls labeled "Add task" and "New note" in the active locale.
2. WHEN the User triggers "Add task", THE Task_Manager_App SHALL open an inline Task creation form on the Dashboard with fields for title, priority, status, tag, and `reminder_at`.
3. WHEN the User submits a valid Task creation form, THE Task_Manager_App SHALL create the Task via the existing Tasks API, SHALL close the form, and SHALL update affected Cards (Todays_Tasks_Card, Task_Status_Summary_Card) without a full page reload.
4. WHEN the User triggers "New note", THE Task_Manager_App SHALL open an inline Note creation form on the Dashboard with fields for title and body.
5. WHEN the User submits a valid Note creation form, THE Task_Manager_App SHALL create the Note via the existing Notes API, SHALL close the form, and SHALL update the Recent_Notes_Card without a full page reload.
6. IF a Quick_Action submission fails validation, THEN THE Task_Manager_App SHALL render localized inline field errors and SHALL keep the form open with the User's input preserved.
7. IF a Quick_Action submission fails with a server error, THEN THE Task_Manager_App SHALL render a localized error message in the form and SHALL keep the User's input preserved.

### Requirement 11: Real-Time Updates

**User Story:** As a User, I want the Dashboard to reflect changes I make in other tabs or on other devices in real time, so that the data I see is always current.

#### Acceptance Criteria

1. WHEN the Dashboard mounts, THE Task_Manager_App SHALL subscribe to the existing Socket_Channel for the authenticated User.
2. WHEN the Task_Manager_App receives a `task:created`, `task:updated`, or `task:deleted` event on the Socket_Channel, THE Dashboard SHALL recompute the Todays_Tasks_Card and the Task_Status_Summary_Card from the updated data.
3. WHEN the Task_Manager_App receives a `note:created`, `note:updated`, or `note:deleted` event on the Socket_Channel, THE Dashboard SHALL recompute the Recent_Notes_Card from the updated data.
4. WHEN the Task_Manager_App receives a `bill:updated` or `bill:created` event on the Socket_Channel, THE Dashboard SHALL recompute the Bills_Card from the updated data.
5. WHEN the Task_Manager_App receives a `creditCard:updated` or `creditCard:created` event on the Socket_Channel, THE Dashboard SHALL recompute the Credit_Cards_Card from the updated data.
6. WHEN the Dashboard unmounts, THE Task_Manager_App SHALL release its Socket_Channel listeners registered for the Dashboard.
7. IF the Socket_Channel disconnects, THEN THE Task_Manager_App SHALL render a non-blocking "Live updates paused" indicator regardless of whether the Dashboard is currently mounted, and SHALL re-fetch the Dashboard payload upon reconnection when the Dashboard is mounted.

### Requirement 12: Mobile and iOS Layout

**User Story:** As a User on iPhone, I want the Dashboard to feel native inside the iOS WebView wrapper, so that it is comfortable to use on a small screen.

#### Acceptance Criteria

1. THE Dashboard SHALL render Cards as a single vertical stack at viewport widths below 768 logical pixels.
2. THE Dashboard SHALL render Cards as a two-column grid at viewport widths between 768 and 1199 logical pixels and as a three-column grid at 1200 logical pixels and above.
3. THE Dashboard SHALL use dynamic viewport height units (`dvh`) for full-height regions to accommodate the iOS WebView's dynamic toolbars.
4. THE Dashboard SHALL render its top header as sticky with a backdrop-blur effect consistent with the rest of the application.
5. THE Dashboard SHALL respect the iOS safe area insets on top, bottom, left, and right.
6. THE Dashboard SHALL ensure every interactive control has a hit target of at least 44 × 44 logical pixels.
7. THE Dashboard SHALL pass scroll gestures through to the page so that pull-to-refresh and rubber-band scrolling work as elsewhere in the app.

### Requirement 13: Accessibility

**User Story:** As a User who relies on assistive technology, I want the Dashboard to be operable and understandable, so that I can use it independently.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a localized accessible name for every Card via an appropriate landmark heading or `aria-label`.
2. THE Dashboard SHALL ensure every interactive control is reachable in source order using only the keyboard.
3. THE Dashboard SHALL provide a visible focus indicator on every interactive control that meets a minimum 3:1 contrast ratio against its background.
4. THE Dashboard SHALL ensure all text content meets at least a 4.5:1 contrast ratio against its background in both light and dark themes.
5. THE Dashboard SHALL announce dynamic content changes from real-time updates and Quick_Action submissions via an `aria-live="polite"` region.
6. THE Dashboard SHALL provide non-color cues (icons or text) for status indicators such as priority, overdue, and paid/unpaid.
7. THE Dashboard SHALL render all icon-only buttons with a localized `aria-label` describing the action.

### Requirement 14: Internationalization

**User Story:** As a User who prefers Vietnamese, I want all Dashboard labels, dates, and numbers in my language and locale, so that the Dashboard is consistent with the rest of the app.

#### Acceptance Criteria

1. THE Dashboard SHALL render every UI string through the existing translation layer with keys for both `en` and `vi`.
2. THE Dashboard SHALL format dates and times using the active locale and User_Timezone.
3. THE Dashboard SHALL format monetary amounts using the active locale and the existing currency configuration of the Financial section.
4. THE Dashboard SHALL format numeric counts using the active locale.
5. WHEN the User changes the active locale, THE Dashboard SHALL re-render all visible strings, dates, times, and numbers in the new locale without a full page reload.
6. IF a translation key is missing for the active locale, THEN THE Dashboard SHALL fall back to the `en` value and SHALL log a missing-translation warning to the existing client logger.

### Requirement 15: Theme Support

**User Story:** As a User who uses dark mode, I want the Dashboard to match my theme preference, so that the visual experience is consistent.

#### Acceptance Criteria

1. THE Dashboard SHALL apply the application's active theme (light or dark) to all Cards and controls using the existing theme tokens.
2. WHEN the User toggles the theme, THE Dashboard SHALL re-render with the new theme without a full page reload.
3. THE Dashboard SHALL not introduce any color values outside the existing theme token set.

### Requirement 16: Empty and Error States

**User Story:** As a User who is new to the app or who has not added data to a section, I want each Card to explain what to do next, so that I am not confronted with blank space.

#### Acceptance Criteria

1. THE Dashboard SHALL render a localized Empty_State for every Card whose underlying data set is empty after applying the Card's filters.
2. THE Dashboard SHALL render a localized error state with a "Retry" action for every Card whose underlying data fetch failed.
3. THE Dashboard SHALL render a localized loading skeleton for every Card while the Dashboard_API request is in flight.
4. WHERE a Card supports a Quick_Action that would resolve its Empty_State, THE Dashboard SHALL include that Quick_Action in the Empty_State.

### Requirement 17: Time Zone Handling

**User Story:** As a User who travels, I want "today", "due today", and "this week" computed in my current local time, so that the Dashboard reflects my actual day.

#### Acceptance Criteria

1. THE Dashboard SHALL determine User_Timezone at mount time using `Intl.DateTimeFormat().resolvedOptions().timeZone`.
2. THE Dashboard SHALL pass the resolved User_Timezone to the Dashboard_API on every fetch.
3. THE Dashboard_API SHALL compute Today_Window, This_Week_Window, and Due_Soon_Window in the supplied User_Timezone.
4. WHEN the User_Timezone changes between Dashboard mounts, THE Task_Manager_App SHALL re-fetch the Dashboard payload using the new User_Timezone.
5. THE Dashboard SHALL render every absolute date or time in User_Timezone and the active locale.

### Requirement 18: Dashboard Customization

**User Story:** As a User, I want to choose which Cards appear on my Dashboard and in what order, so that the view focuses on what matters to me.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a "Customize" entry that opens a settings panel listing every available Card with a visibility toggle and a reorder control.
2. WHEN the User changes a Card's visibility or position in the customize panel, THE Task_Manager_App SHALL persist the change to Dashboard_Preferences via a server endpoint scoped to the current User.
3. WHEN the User opens the Dashboard, THE Task_Manager_App SHALL render Cards according to the User's saved Dashboard_Preferences.
4. WHERE the User has no saved Dashboard_Preferences, THE Dashboard SHALL render all Cards in the default order: Today's Tasks, Task Status Summary, Bills, Credit Cards, Recent Notes, Weather, Daily Quote.
5. IF the Task_Manager_App fails to apply the default Card order, THEN THE Dashboard SHALL render an empty Cards region with the localized error message "Dashboard could not be loaded" and a "Retry" action.
6. THE Dashboard SHALL provide a "Reset to default" action in the customize panel that clears the User's Dashboard_Preferences.
7. THE Dashboard SHALL provide, in the customize panel, a "Default landing view" selector with the options "Today" and "Last used", and SHALL persist that choice to Dashboard_Preferences.

### Requirement 19: Performance Budgets

**User Story:** As a User, I want the Dashboard to feel snappy on my phone, so that landing on it does not slow me down.

#### Acceptance Criteria

1. THE Dashboard_API SHALL return its aggregated payload within 500 milliseconds at the 95th percentile under typical per-User data volumes (up to 500 Tasks, 200 Notes, 50 Bills, 20 Credit_Cards).
2. THE Dashboard SHALL render its first interactive frame within 1500 milliseconds after the Dashboard_API response is received on a mid-tier mobile device.
3. WHEN a real-time event triggers a Card recomputation, THE Dashboard SHALL apply the update within 200 milliseconds of receiving the event without a full payload re-fetch.
4. THE Dashboard SHALL not issue more than one Dashboard_API request per Dashboard mount, except for explicit "Retry" actions and Socket_Channel reconnection re-fetches.

## Assumptions and Open Questions

The following decisions have been encoded as defaults in the requirements above. Please confirm or adjust during requirements review; any change will be reflected in the affected requirement.

1. **Default landing view after login.** Default is the Dashboard, with a User-controlled preference to switch to "last used" (Requirements 1.2, 1.3, 18.6).
2. **Time zone source.** The User_Timezone is resolved from the browser at mount time and passed to the Dashboard_API; the server falls back to UTC if the value is missing or invalid (Requirements 2.4, 2.5, 17).
3. **"Due soon" window.** Default 3 days for both Bills and Credit_Card closing dates (Glossary: Due_Soon_Window). Made configurable later if desired.
4. **Card interaction model.** Tapping a row navigates to the underlying section. Quick_Action creation is inline on the Dashboard. No general-purpose Inline_Preview is included in v1 to keep scope contained (Requirements 3.6, 5.3, 6.6, 7.4, 8.3, 10).
5. **Mobile vs grid layout.** Vertical stack below 768px, two-column grid 768–1199px, three-column grid at 1200px+ (Requirement 12.1, 12.2).
6. **Customization.** Per-User visibility and order persisted server-side, with reset to default (Requirement 18).
7. **Empty states.** Each Card has its own localized Empty_State, and Cards with a natural Quick_Action surface that action in the Empty_State (Requirements 3.8, 4.4, 5.6, 6.8, 7.5, 7.6, 8.4, 16).
8. **Real-time updates.** The Dashboard subscribes to the existing per-User Socket.IO room and recomputes affected Cards from emitted events without a full re-fetch, except on reconnect (Requirement 11).
