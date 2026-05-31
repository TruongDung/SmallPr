# Implementation Plan

## Overview

This plan turns `design.md` into discrete, ordered, test-backed implementation tasks. Each task references the requirements it satisfies (`_Requirements: X.Y_`). Tasks are ordered so each one only depends on previously completed tasks. Dependencies are called out explicitly in the **Depends on** line.

The plan is split into phases:

1. **Backend foundations** — schema, daily-quote extraction, dashboard service, dashboard router.
2. **Real-time emits** — `bill:updated` and `card:updated` from existing routes.
3. **Frontend module** — dashboard module, section markup, app.js wiring.
4. **Card renderers** — one task per card.
5. **Quick actions, customize, real-time, polish** — UI affordances, persistence, i18n, theming, a11y.
6. **Tests and verification** — server tests, manual QA, cache version bumps, deployment.

Each task is small enough to land in a single commit. After every backend or wiring task, run `npm test` before moving on.

## Task Dependency Graph

The graph below summarizes the **Depends on** lines of every task. Tasks not listed have no prerequisites. The graph contains no cycles, so any topological order of tasks is a valid execution order.

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2", "5", "6", "7"] },
    { "wave": 2, "tasks": ["3", "8"] },
    { "wave": 3, "tasks": ["4", "20"] },
    { "wave": 4, "tasks": ["9"] },
    { "wave": 5, "tasks": ["10", "11", "12", "13", "14", "15", "16", "19"] },
    { "wave": 6, "tasks": ["17", "18", "21", "23", "25"] },
    { "wave": 7, "tasks": ["22", "24"] },
    { "wave": 8, "tasks": ["26"] },
    { "wave": 9, "tasks": ["27"] }
  ],
  "edges": [
    { "from": "2",  "to": "3" },
    { "from": "1",  "to": "4" },
    { "from": "3",  "to": "4" },
    { "from": "7",  "to": "8" },
    { "from": "4",  "to": "9" },
    { "from": "8",  "to": "9" },
    { "from": "8",  "to": "10" }, { "from": "9",  "to": "10" },
    { "from": "8",  "to": "11" }, { "from": "9",  "to": "11" },
    { "from": "8",  "to": "12" }, { "from": "9",  "to": "12" },
    { "from": "8",  "to": "13" }, { "from": "9",  "to": "13" },
    { "from": "8",  "to": "14" }, { "from": "9",  "to": "14" },
    { "from": "8",  "to": "15" }, { "from": "9",  "to": "15" },
    { "from": "8",  "to": "16" }, { "from": "9",  "to": "16" },
    { "from": "10", "to": "17" }, { "from": "11", "to": "17" }, { "from": "12", "to": "17" },
    { "from": "5",  "to": "18" }, { "from": "6",  "to": "18" }, { "from": "8",  "to": "18" }, { "from": "9",  "to": "18" },
    { "from": "4",  "to": "19" }, { "from": "9",  "to": "19" },
    { "from": "7",  "to": "20" },
    { "from": "8",  "to": "21" }, { "from": "10", "to": "21" }, { "from": "11", "to": "21" }, { "from": "12", "to": "21" }, { "from": "13", "to": "21" }, { "from": "14", "to": "21" }, { "from": "15", "to": "21" }, { "from": "16", "to": "21" },
    { "from": "19", "to": "22" }, { "from": "20", "to": "22" }, { "from": "21", "to": "22" },
    { "from": "8",  "to": "23" }, { "from": "10", "to": "23" }, { "from": "12", "to": "23" }, { "from": "13", "to": "23" }, { "from": "14", "to": "23" }, { "from": "16", "to": "23" },
    { "from": "4",  "to": "24" }, { "from": "8",  "to": "24" }, { "from": "18", "to": "24" }, { "from": "20", "to": "24" },
    { "from": "1",  "to": "25" }, { "from": "2",  "to": "25" }, { "from": "3",  "to": "25" }, { "from": "4",  "to": "25" },
    { "from": "17", "to": "26" }, { "from": "18", "to": "26" }, { "from": "22", "to": "26" }, { "from": "23", "to": "26" }, { "from": "24", "to": "26" }, { "from": "25", "to": "26" },
    { "from": "25", "to": "27" }, { "from": "26", "to": "27" }
  ],
  "criticalPath": ["2", "3", "4", "9", "10", "17", "22", "26", "27"]
}
```

The ASCII summary below restates the same dependencies for quick scanning:

```
Task 1  (users.dashboard_preferences column)
Task 2  (extract dailyQuote.service.js)
Task 3  (dashboard.service.js)                       ◄── 2
Task 4  (dashboard.routes.js)                        ◄── 1, 3
Task 5  (emit bill:updated)
Task 6  (emit card:updated)
Task 7  (index.html section + asset wiring)
Task 8  (dashboard.module.js skeleton)               ◄── 7
Task 9  (wire dashboard into app.js)                 ◄── 4, 8
Task 10 (Today's Tasks card)                         ◄── 8, 9
Task 11 (Task Status Summary card)                   ◄── 8, 9
Task 12 (Recent Notes card)                          ◄── 8, 9
Task 13 (Bills Attention card)                       ◄── 8, 9
Task 14 (Credit Cards Snapshot card)                 ◄── 8, 9
Task 15 (Weather card)                               ◄── 8, 9
Task 16 (Daily Quote card)                           ◄── 8, 9
Task 17 (Quick Add Task / New Note actions)          ◄── 10, 11, 12
Task 18 (Socket.IO subscription + reconnect refetch) ◄── 5, 6, 8, 9
Task 19 (Customize modal)                            ◄── 4, 9
Task 20 (CSS — grid, chrome, skeletons, states)      ◄── 7
Task 21 (Translations + i18n re-render)              ◄── 8, 10, 11, 12, 13, 14, 15, 16
Task 22 (Accessibility pass)                         ◄── 19, 20, 21
Task 23 (Time-zone behavior + locale formatting)     ◄── 8, 10, 12, 13, 14, 16
Task 24 (Performance budgets)                        ◄── 4, 8, 18, 20
Task 25 (Backend tests in server.test.js)            ◄── 1, 2, 3, 4
Task 26 (Manual QA pass)                             ◄── all preceding
Task 27 (Cache busting + deploy)                     ◄── 25, 26
```

Critical path (longest chain): **2 → 3 → 4 → 9 → 10 → 17 → 22 → 26 → 27**.

## Tasks

### Phase 1 — Backend foundations

- [ ] 1. Add `dashboard_preferences` JSONB column to `users`
  - Inside `initializeDatabase()` in `server.js`, after the existing `users` ALTERs, add:
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB`
  - Confirm the migration runs on a fresh CI Postgres and on Supabase without errors.
  - **Depends on:** none.
  - _Requirements: 18.2, 18.3, 18.4, 18.6_

- [ ] 2. Extract `dailyQuote.service.js`
  - Create `src/server/services/dailyQuote.service.js` exporting `fetchDailyQuote()` and `DEFAULT_DAILY_QUOTE`.
  - Move the existing logic out of `server.js`. Replace `server.js`'s inline implementation and the `GET /api/daily-quote` handler with imports from the new service.
  - Keep behavior identical: same upstream order (`zenquotes.io` → `api.quotable.io`) and same default fallback object.
  - **Depends on:** none.
  - _Requirements: 9.1, 9.2, 9.4_

- [ ] 3. Implement `dashboard.service.js`
  - Create `src/server/services/dashboard.service.js` exporting a factory `createDashboardService({ allAsync, getAsync })` whose `loadDashboard(userId, { tz, dueSoonDays })` runs every per-card loader in parallel via `Promise.allSettled` and returns the `{ ok, data | error }` shape from §3.1 of `design.md`.
  - Per-card loaders to implement inside this module:
    - `loadTodaysTasks` — overdue / today / in_progress with the SQL from §4.1, partitioned and trimmed to 5 per subsection. Project `id, title, priority, tag, reminder_at, status` only.
    - `loadTaskStatusSummary` — three counts (`todo`, `in_progress`, `done`) for non-archived tasks owned by the user.
    - `loadRecentNotes` — top 5 notes by `updated_at` desc, returning `id, title, updated_at`, plus a 120-char `excerpt` produced by stripping HTML and trimming with trailing `…` when truncated. Reuse the existing `stripHtml` helper from the tasks code path.
    - `loadBills` — `Unpaid` bills partitioned into `overdue / dueSoon / undated`, capped at 5, projecting `id, item, amount, due_date, pay_before`. Compare `due_date` lexically against `'YYYY-MM-DD'` strings.
    - `loadCreditCardSummary` — `totalBalance` and `totalInterest` summed server-side as decimal strings, plus an `approachingClose` list (cards within Due_Soon_Window) ordered ascending. Project `id, name, total_balance, closing_date, daysUntilClose`.
    - `loadWeatherCard` — Primary_City selection (explicit primary flag → lowest sort order) and current weather summary using the existing weather data source.
    - `loadDailyQuote` — passthrough to `dailyQuote.service.js`.
  - Add a `dayWindow(tz, daysFromToday)` helper that computes `[startISO, endISO)` for the given IANA `tz` using `Intl.DateTimeFormat` and tested against fixtures for `'UTC'`, `'America/New_York'`, and `'Asia/Ho_Chi_Minh'`.
  - **Depends on:** Task 2.
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.8, 3.1, 3.2, 3.3, 3.5, 4.1, 5.1, 5.2, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.6, 8.1, 8.2, 8.5, 9.1, 17.3_

- [ ] 4. Implement `dashboard.routes.js`
  - Create `src/server/routes/dashboard.routes.js` exporting `createDashboardRouter({ authRequired, allAsync, getAsync, runAsync })` with three handlers:
    - `GET /dashboard` — validates `tz` (uses `Intl.supportedValuesOf('timeZone')` when available, else regex; falls back to UTC and sets `timezoneFallback: true`), clamps `dueSoonDays` to `[1, 14]` (default `3`), fetches preferences, calls `loadDashboard`, and returns the §3.1 payload with `Cache-Control: no-store`.
    - `PUT /dashboard/preferences` — validates `defaultLanding ∈ {'today','last_used'}`; ensures every known card id appears exactly once, drops unknown ids, normalizes `order` to `0..n-1`; persists via `UPDATE users SET dashboard_preferences = $1 WHERE id = $2`. Returns the persisted shape plus `updated_at`.
    - `POST /dashboard/preferences/reset` — sets `dashboard_preferences = NULL` and returns the merged defaults.
  - Add a `loadPreferences(userId)` helper that merges the stored JSON over the defaults (`todaysTasks → taskStatusSummary → bills → creditCards → recentNotes → weather → dailyQuote`, all visible) so newly added cards surface for existing users.
  - Mount with `app.use('/api', createDashboardRouter({...}))` in `server.js`.
  - **Depends on:** Tasks 1, 3.
  - _Requirements: 2.1, 2.3, 2.5, 2.7, 18.1, 18.2, 18.3, 18.4, 18.6, 18.7, 19.4_

---

### Phase 2 — New real-time emits from existing routes

- [ ] 5. Emit `bill:updated` from credit-cards routes
  - In `src/server/routes/creditCards.routes.js`, import `emitToUser` from `../realtime`.
  - In the `PUT /api/credit-cards/fast-access-bills/:id` handler, after the successful update, emit `emitToUser(req.session.userId, 'bill:updated', { bill: updatedBill })`. Match the existing `task:updated` pattern (emit only after the DB write resolves, with the post-update row).
  - **Depends on:** none.
  - _Requirements: 11.4_

- [ ] 6. Emit `card:updated` from credit-cards routes
  - In the same router, after each successful write to credit cards (`POST /`, `PUT /:id`, `DELETE /:id`), emit `emitToUser(req.session.userId, 'card:updated', { id })`.
  - **Depends on:** none.
  - _Requirements: 11.5_

---

### Phase 3 — Frontend section, module, and routing

- [ ] 7. Add `<section id="dashboard-section">` and asset wiring to `index.html`
  - Insert the section markup from §7.2 next to existing sections, including the sticky header, the three `task-action-icon` buttons (`+`, `✎`, `⚙`), the `aria-live="polite"` region, and `<div class="dashboard-grid">`.
  - Add a top-level navigation entry with `data-task-tab="dashboard"` whose label uses the `dashboardTab` translation key.
  - Add `<script src="js/features/dashboard/dashboard.module.js?v=dashboard-1"></script>`.
  - Bump the `styles.css?v=` query string and the `CACHE_NAME` in `public/sw.js`. Make sure `sw.js` exempts `/api/dashboard*` from the cache (network-only) and keeps the existing `/socket.io/*` exemption.
  - **Depends on:** none (markup only).
  - _Requirements: 1.1, 1.5, 12.4, 12.5_

- [ ] 8. Create `dashboard.module.js` skeleton
  - Add `public/js/features/dashboard/dashboard.module.js` exporting `window.DashboardModule = { create }` with the factory shape from §7.1. Implement:
    - `applyTranslations()` — updates the section title, button labels, and any cached card titles.
    - `bind()` — wires the header button click handlers and the customize modal opener.
    - `load({ silent })` — `request('/api/dashboard?tz=' + encodeURIComponent(tz))`, calling `renderSkeletons()` first when not silent and `renderError(err)` on failure.
    - `refresh()` — alias for `load({ silent: true })`.
    - `scheduleRefresh()` with a 150 ms debounce (single timer guard).
  - Stub `renderAll`, `renderCard`, `renderSkeletons`, and `renderError` to render placeholder DOM so the module is verifiable end-to-end before per-card renderers land.
  - **Depends on:** Task 7.
  - _Requirements: 2.1, 2.6, 19.4_

- [ ] 9. Wire the dashboard into `app.js`
  - Add `'dashboard'` to `VIEW_NAMES`.
  - Extend `showSection()` with a dashboard branch that toggles the section's `hidden` class and calls `dashboardModule.load()` on first show / on each show.
  - During `init()`, after `/api/me` resolves, fetch the dashboard preferences once (via the same `/api/dashboard` call the module makes) and resolve initial view:
    - `defaultLanding === 'last_used'` → use `localStorage[SAVED_VIEW_KEY]` constrained to `VIEW_NAMES`; otherwise force `currentView = 'dashboard'`.
  - Mount `dashboardModule.create({ request, t, getLanguage: () => currentLanguage, showStatusToast, openAddTask: () => showAddTaskModal(), openNewNote: () => { setCurrentView('notes'); showSection(); /* existing notesModule.addNote pattern */ } })` next to other module mounts and call `bind()`.
  - **Depends on:** Tasks 4, 8.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

---

### Phase 4 — Card renderers

Each card is a self-contained renderer that takes the `{ ok, data | error }` shape from `/api/dashboard` and produces a `<section class="dashboard-card" data-card="..."> ` element. Tasks in this phase can run in any order after Phase 3, but each one must update `renderCard()`'s dispatch table.

- [ ] 10. Render the Today's Tasks card
  - Render three labeled subsections in source order: Overdue → Today → In Progress, each capped at 5 rows.
  - Each row shows title, priority indicator (icon + text label), tag (when present), and a localized due/reminder label using `Intl.DateTimeFormat` in `User_Timezone`.
  - Tapping a row navigates to the Tasks tab and opens the existing detail modal for that task id.
  - Each row has a "Mark done" toggle that PATCHes the existing tasks API to `status: 'done', completed: true`. On success, re-render the card optimistically.
  - Render a "View all" link (key `viewAllTasks`) when `data.totalMatching > rows.length`.
  - Each row carries `data-status="todo|in_progress|done"` so the existing per-status accent variables apply via CSS (§9.4).
  - Empty state (key `dashboardEmptyTasks`) includes a Quick_Action button that triggers `openAddTask()`.
  - **Depends on:** Tasks 8, 9.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 11. Render the Task Status Summary card
  - Three cells (Todo / In progress / Done) each rendering the localized label, the formatted count (`Intl.NumberFormat`), and the same icon used in the Tasks tab.
  - Tapping a cell navigates to the Tasks tab pre-filtered to that status (set the existing tasks status filter then `setCurrentView('tasks'); showSection();`).
  - Render the Empty_State Quick_Action only when all three counts are zero (key `dashboardEmptyTasks`).
  - **Depends on:** Tasks 8, 9.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 12. Render the Recent Notes card
  - List up to 5 notes (top 5 by `updated_at` desc as returned by the API).
  - Each row shows the title (or `Untitled note` fallback for a missing title), a 120-char excerpt with `…` when truncated, and a localized relative-time label.
  - Tapping a row routes into the Notes tab and opens that note in the existing editor.
  - Render a "View all notes" link (key `viewAllNotes`).
  - Empty state (key `dashboardEmptyNotes`) includes a Quick_Action that triggers `openNewNote()`.
  - **Depends on:** Tasks 8, 9.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 13. Render the Bills Attention card
  - Three labeled subsections: Overdue → Due soon → Undated, each capped at 5.
  - Each row shows item, amount (locale-formatted via existing currency formatters), short due date (or no date for undated), and `pay_before` when present.
  - Tapping a row navigates to the Financial → Fast-access Bills section and scrolls the row into view (use the existing scroll-into-view utility or `element.scrollIntoView({ block: 'center' })`).
  - "Mark paid" control PUTs `status: 'Paid'` to the existing bills API. On success re-render the card optimistically.
  - Render a "View all bills" link (key `viewAllBills`) when `data.totalMatching > rendered`.
  - Empty state (key `dashboardEmptyBills`) has no Quick_Action (bills are seeded from defaults).
  - **Depends on:** Tasks 8, 9.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [ ] 14. Render the Credit Cards Snapshot card
  - Top area: grand total of `total_balance` + grand total of `interest_charge`, both locale-formatted.
  - List every card in `data.approachingClose` ordered ascending, showing `name`, formatted `total_balance`, and `Closes in N days` using the `closesInDays` translation.
  - Tapping the totals area or a row navigates to Financial → Credit Cards.
  - Render `dashboardEmptyCards` when there are zero cards; render `dashboardNoApproachingClose` alongside totals when there are cards but none are approaching.
  - **Depends on:** Tasks 8, 9.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 15. Render the Weather card
  - Show city name, current temperature in the user's preferred unit, condition label, and condition icon, all sourced from the existing Weather data.
  - Tapping the card navigates to the Weather tab and selects the Primary_City.
  - Empty state (key `dashboardEmptyWeather`) when no city is saved.
  - Error state (key `dashboardWeatherUnavailable`) with retry when upstream fails.
  - **Depends on:** Tasks 8, 9.
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 16. Render the Daily Quote card
  - Show the quote text and attribution.
  - On local-day rollover (compare last-rendered date to `new Date().toLocaleDateString('en-CA', { timeZone: tz })` on a `setInterval` of 60 s), refetch the dashboard so the quote refreshes for the new day.
  - Error state falls back to `DEFAULT_DAILY_QUOTE` (key `dashboardQuoteUnavailable`).
  - **Depends on:** Tasks 8, 9.
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

---

### Phase 5 — Quick actions, real-time, customize, polish

- [ ] 17. Quick Add Task and New Note actions
  - Wire the header `+` button to `openAddTask()` (which calls the existing add-task modal). On modal save, the task list reload already runs; trigger `dashboardModule.refresh()` after the modal's success path to update affected cards (Today's Tasks, Task Status Summary).
  - Wire the header `✎` button to `openNewNote()`. After a new note is created in the Notes section, `note:created` will fire and the Recent Notes card will refresh via the realtime path.
  - Validation/error UX inside the modals already exists; no inline form is added on the dashboard for v1 (the design's Quick_Action submission states map onto the existing modals).
  - **Depends on:** Tasks 10, 11, 12.
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ] 18. Subscribe to Socket.IO events on the dashboard
  - In `dashboard.module.js`, `bind()` attaches handlers to `window.realtimeSocket` for `task:created|updated|deleted`, `note:created|updated|deleted`, `bill:updated`, `card:updated`. Each handler calls `scheduleRefresh()` (150 ms debounced) which calls `load({ silent: true })`.
  - On `connect`, clear the "Live updates paused" banner; on `disconnect`, render it (i18n keys `dashboardLiveResumed`, `dashboardLivePaused`).
  - On reconnect after a disconnect, force one `load({ silent: false })` so the user sees the change.
  - On `showSection()` switching away from the dashboard, detach the listeners but do not disconnect the socket.
  - **Depends on:** Tasks 5, 6, 8, 9.
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [ ] 19. Customize modal
  - Build a modal opened from the `⚙` button. Fields:
    - `<select>` for `defaultLanding` (`Today` / `Last used`).
    - One row per card with a visibility checkbox, two `▲`/`▼` reorder buttons, and the localized card label.
    - Primary "Save" → `PUT /api/dashboard/preferences` then `dashboardModule.refresh()`.
    - Secondary "Reset to default" → `POST /api/dashboard/preferences/reset` then refresh.
  - Move focus into the modal on open, restore focus on close. Trap focus inside the modal while open. Esc closes.
  - **Depends on:** Task 4, 9.
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.6, 18.7_

- [ ] 20. CSS — grid, breakpoints, header chrome, skeletons, error/empty states
  - Add the new class set from §9.1. Implement the grid breakpoints from §9.2 (1 col < 768, 2 col 768–1199, 3 col ≥ 1200).
  - Sticky header with backdrop-blur, safe-area paddings (`env(safe-area-inset-*)`), `100dvh` minimums, and ≥44pt touch targets (REQ-12.3 to 12.7).
  - Per-status accent rules for the Today's Tasks card from §9.4.
  - CSS-only skeleton animation from §9.5.
  - All new declarations use existing theme tokens — no raw color literals.
  - Bump `styles.css?v=` and `sw.js`'s `CACHE_NAME` in lockstep.
  - **Depends on:** Task 7.
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 15.1, 15.2, 15.3, 16.1, 16.2, 16.3, 16.4_

- [ ] 21. Translations and i18n re-render
  - Add every key from §10.2 to `translations.en` and `translations.vi` in `public/app.js`.
  - `dashboardModule.applyTranslations()` updates the section title, button `aria-label`s, every card title, every "View all" link, every empty-state copy, and re-renders any open card content that contains formatted dates/numbers.
  - Hook `applyTranslations()` to the existing language-switch callback alongside the other modules.
  - When a translation key is missing for the active locale, fall back to `en` and `console.warn`.
  - **Depends on:** Tasks 8, 10, 11, 12, 13, 14, 15, 16.
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [ ] 22. Accessibility pass
  - Verify each card has `role="region"` with `aria-labelledby` pointing to its title.
  - One root `aria-live="polite"` region in the header announces realtime refreshes (e.g. "Updated") and Quick_Action results.
  - Every icon-only button has a localized `aria-label`. Status indicators carry both color and a textual label.
  - Tab order matches source order; focus is visible on every interactive control with at least 3:1 contrast against the background; modal focus is trapped.
  - **Depends on:** Tasks 19, 20, 21.
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [ ] 23. Time-zone behavior and locale formatting
  - In `dashboardModule.load()`, resolve `Intl.DateTimeFormat().resolvedOptions().timeZone` with a UTC fallback and pass it to the API.
  - On every render, format absolute dates via `Intl.DateTimeFormat(currentLanguage, { timeZone, dateStyle, timeStyle })` and counts/currency via existing locale-aware formatters.
  - When the resolved tz differs from the previous mount's tz, force a fresh `load()`.
  - **Depends on:** Tasks 8, 10, 12, 13, 14, 16.
  - _Requirements: 14.2, 14.3, 14.4, 17.1, 17.2, 17.4, 17.5_

- [ ] 24. Performance budgets
  - Confirm a single `GET /api/dashboard` per mount (count requests in the Network panel during a manual run).
  - Skeletons appear within one frame of render (CSS-only, no JS-driven animation).
  - First interactive frame within 1500 ms of the API response on a mid-tier device (manual measurement on Vercel deployment using Chrome DevTools throttling at "Fast 4G").
  - Realtime-driven updates apply within 200 ms of receiving the event after the 150 ms debounce.
  - **Depends on:** Tasks 4, 8, 18, 20.
  - _Requirements: 19.1, 19.2, 19.3, 19.4_

---

### Phase 6 — Tests, verification, and deployment

- [ ] 25. Backend tests in `server.test.js`
  - Add a new `describe('Dashboard API', ...)` block covering:
    1. `GET /api/dashboard` requires auth.
    2. `PUT /api/dashboard/preferences` and `POST /api/dashboard/preferences/reset` require auth.
    3. Aggregated payload shape — the `cards.{...}` keys all exist with `{ ok, data | error }`.
    4. Time-zone correctness — same task lands in `today` for `America/New_York` but not for UTC when its `reminder_at` is at 03:00 UTC of the next day.
    5. Due-soon window — bill due in 2 days appears with `dueSoonDays=3` and not with `dueSoonDays=1`.
    6. Partial failure — stub one loader to throw; the response stays 200 and the affected card returns `ok: false` while every other card returns `ok: true`.
    7. Preferences round-trip — `PUT` then `GET` reflects the change; `POST .../reset` returns to defaults.
    8. Field projection — `description`, `comment`, `attachment_data` are absent from the dashboard payload regardless of underlying data.
    9. Excerpt trimming — a 500-char note body returns a 120-char `excerpt` ending in `…`.
    10. Default landing — without preferences, `preferences.defaultLanding === 'today'`.
  - Use the existing `createAgent`, RUN_ID-prefixed usernames, and direct `db.query` seeding patterns. Run `npm test` and confirm all suites pass.
  - **Depends on:** Tasks 1, 2, 3, 4.
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.7, 2.8, 3.1, 5.2, 6.1, 6.3, 17.3, 18.2, 18.4_

- [ ] 26. Manual QA pass
  - Walk the manual test plan from §14.2 of `design.md` end-to-end on the live deployment (Vercel) and on the iOS WebView wrapper. Confirm: default landing, every card's populated and empty paths, quick add task, quick new note, real time across two tabs, customize visibility/order/reset, default-landing preference, locale switch, dark mode, iOS safe-area + sticky header blur, time-zone change, network throttle to offline.
  - **Depends on:** all preceding tasks.
  - _Requirements: 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18_

- [ ] 27. Cache busting and deployment
  - Final pass on `?v=` query strings (`styles.css`, `dashboard.module.js`, any other touched script) and `sw.js` `CACHE_NAME`.
  - Stage only the files this feature touches (exclude `ios/.../UserInterfaceState.xcuserstate`).
  - Commit and push to `main`. After Vercel finishes deploying, smoke-test the dashboard on the iOS app (which loads `https://small-pr.vercel.app/`).
  - **Depends on:** Tasks 25, 26.
  - _Requirements: 12, 14, 15_

---

## Notes

### Out of scope

Tracked per design §15 — not part of this plan:

- Web push or APNs notifications.
- Multi-day calendar grid.
- AI-generated summaries.
- Drag-and-drop card reorder (v2).
- Any change to existing Tasks/Notes/Financial/Weather sections beyond Tasks 5 and 6.
- Replacing `localStorage[SAVED_VIEW_KEY]` semantics.

### Risks acknowledged in plan

- Vercel cannot hold open WebSocket connections; live updates degrade silently on Vercel and surface honestly via the `dashboardLivePaused` banner. Plan still works; only the "real-time" UX is reduced. (Design §16 risk 1.)
- `due_date` is `TEXT` formatted `'YYYY-MM-DD'`; the Bills loader relies on lexical comparison. Any future relaxation of that format requires changing the loader. (Design §16 risk 5.)
