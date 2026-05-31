# Design Document — Dashboard / Today View

## Overview

This design implements the Dashboard / Today View defined in `requirements.md`. The Dashboard is a new section in the existing PWA that aggregates summary data from the existing Tasks, Notes, Financial (Credit Cards + Fast-access Bills), Weather, and Daily Quote sources into a single landing view, served by a single aggregated HTTP endpoint and refreshed in real time via the existing per-user Socket.IO room.

The Dashboard does not change the internal behavior of any existing section. It introduces:

- One new Express route factory and one new service module on the backend.
- Two small additions to existing route handlers (one new Socket.IO emit each).
- One new column on the `users` table for per-user dashboard preferences.
- One new frontend feature module, one new section in `index.html`, and a small set of CSS rules and translation keys.

**Mapped requirements:** REQ-1 through REQ-19 (every requirement in `requirements.md`).

**Non-goals (explicitly out of scope):**
- Push notifications (web push or APNs).
- Multi-day calendar grid.
- AI summaries / smart sort.
- Drag-and-drop reorder of cards (replaced by up/down buttons in v1; see §8).
- Any change to existing Tasks/Notes/Financial/Weather internals beyond two new Socket.IO emits.

## Architecture

### 2.1 High-level component flow

```
                       ┌──────────────────────────────────────────┐
                       │              Browser / iOS WKWebView      │
                       │                                            │
                       │   public/app.js  ──┬── feature modules ───┤
                       │                    │                       │
                       │                    └─► dashboard.module.js │
                       │                          │                 │
                       │                    GET /api/dashboard       │
                       │                    PUT /api/dashboard/      │
                       │                          preferences        │
                       │                                            │
                       │   socket.io-client (existing)              │
                       │     ◄─ task:created/updated/deleted        │
                       │     ◄─ note:created/updated/deleted        │
                       │     ◄─ bill:updated   (NEW)                │
                       │     ◄─ card:updated   (NEW)                │
                       └──────────────┬─────────────────────────────┘
                                      │
                                      ▼  HTTPS / WebSocket
                       ┌──────────────────────────────────────────┐
                       │            Node.js / Express              │
                       │                                            │
                       │   server.js                                │
                       │     ├── express-session (Postgres-backed) │
                       │     ├── Socket.IO (shares session)         │
                       │     ├── createTasksRouter                  │
                       │     ├── createCreditCardsRouter            │
                       │     └── createDashboardRouter   (NEW)      │
                       │                                            │
                       │   src/server/services/                     │
                       │     ├── tasks.service.js                   │
                       │     ├── creditCards.service.js             │
                       │     ├── dailyQuote.service.js   (NEW)      │
                       │     └── dashboard.service.js    (NEW)      │
                       │                                            │
                       │   src/server/realtime.js                   │
                       │     emitToUser(userId, event, payload)     │
                       └──────────────┬─────────────────────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────────────────┐
                       │          Postgres (Supabase)              │
                       │   tables: users, tasks, task_tags,        │
                       │           notes, fast_access_bills,       │
                       │           fast_access_bill_defaults,      │
                       │           credit_cards, weather_cities,   │
                       │           session                          │
                       │   new column on users:                     │
                       │           dashboard_preferences JSONB      │
                       └──────────────────────────────────────────┘
```

### 2.2 Default landing flow

Encoded in `public/app.js`:

1. On page load, `init()` calls `GET /api/me`.
2. If a session exists, the app reads `dashboard_preferences.defaultLanding` from the dashboard payload (returned by `/api/dashboard`) on first navigation.
3. Resolution rule (REQ-1.2 / REQ-1.3 / REQ-1.4):
   - If `defaultLanding === 'last_used'`, use `localStorage[SAVED_VIEW_KEY]` (existing key) constrained to `VIEW_NAMES`. If that value is `'dashboard'`, render Dashboard with the same chrome as the default-preference path.
   - Otherwise (default), force `currentView = 'dashboard'` regardless of the saved value.
4. The Dashboard section is added to `VIEW_NAMES` and to `showSection()`.

**Satisfies:** REQ-1.

### 2.3 Section toggle

A new `<section id="dashboard-section" class="card hidden">` is added to `public/index.html` next to the existing sections. `showSection()` is extended with one branch:

```js
const showDashboard = currentView === 'dashboard';
dashboardSection.classList.toggle('hidden', !showDashboard);
if (showDashboard) dashboardModule.load();
```

The user reaches the Dashboard via a top-level nav entry whose label key is `dashboardTab` (`Today` / `Hôm nay`, REQ-1.1) and from any section's tab bar.

## Components and Interfaces

### 3.1 `GET /api/dashboard`

**Purpose.** Return the entire Dashboard payload for the authenticated user in a single round trip (REQ-2).

**Auth.** `authRequired` middleware (existing). Returns `401 { error: 'Authentication required' }` for anonymous requests.

**Query parameters.**

| Name          | Type    | Default | Notes |
|---------------|---------|---------|-------|
| `tz`          | string  | `'UTC'` | IANA timezone resolved client-side via `Intl.DateTimeFormat().resolvedOptions().timeZone`. Validated with `Intl.supportedValuesOf('timeZone').includes(tz)` if available, else with a regex. Invalid values fall back to UTC and `timezoneFallback: true` is set in the response. (REQ-2.4, REQ-2.5, REQ-17) |
| `dueSoonDays` | integer | `3`     | Range `[1, 14]`; values outside the range are clamped silently. (Glossary `Due_Soon_Window`) |

**Response shape.**

```json
{
  "timezone": "America/New_York",
  "timezoneFallback": false,
  "today": "2026-05-30",
  "preferences": {
    "version": 1,
    "defaultLanding": "today",
    "cards": [
      { "id": "todaysTasks",        "visible": true,  "order": 0 },
      { "id": "taskStatusSummary",  "visible": true,  "order": 1 },
      { "id": "bills",              "visible": true,  "order": 2 },
      { "id": "creditCards",        "visible": true,  "order": 3 },
      { "id": "recentNotes",        "visible": true,  "order": 4 },
      { "id": "weather",            "visible": true,  "order": 5 },
      { "id": "dailyQuote",         "visible": true,  "order": 6 }
    ]
  },
  "cards": {
    "todaysTasks": {
      "ok": true,
      "data": {
        "overdue":     [{ "id": 12, "title": "...", "priority": "high",   "tag": "Work", "reminder_at": "2026-05-29T14:00:00Z", "status": "todo" }],
        "today":       [{ "id": 18, "title": "...", "priority": "medium", "tag": "",      "reminder_at": "2026-05-30T17:30:00Z", "status": "todo" }],
        "in_progress": [{ "id": 22, "title": "...", "priority": "low",    "tag": "",      "reminder_at": null,                  "status": "in_progress" }],
        "totalMatching": 7
      }
    },
    "taskStatusSummary": {
      "ok": true,
      "data": { "todo": 4, "in_progress": 2, "done": 11 }
    },
    "recentNotes": {
      "ok": true,
      "data": [
        { "id": 5, "title": "Trip plan", "excerpt": "Day 1 …", "updated_at": "2026-05-30T13:11:00Z" }
      ]
    },
    "bills": {
      "ok": true,
      "data": {
        "overdue":  [{ "id": 1, "item": "Internet", "amount": "54.99", "due_date": "2026-05-25", "pay_before": "30th" }],
        "dueSoon":  [{ "id": 2, "item": "Phone",    "amount": "78.20", "due_date": "2026-06-01", "pay_before": "5th"  }],
        "undated":  [{ "id": 3, "item": "HOA",      "amount": "73.33", "due_date": null,         "pay_before": null   }],
        "totalMatching": 3
      }
    },
    "creditCards": {
      "ok": true,
      "data": {
        "totalBalance":   "25829.16",
        "totalInterest":  "73.05",
        "approachingClose": [
          { "id": 1, "name": "Citi •• 4242", "total_balance": "1234.56", "closing_date": "2026-06-02", "daysUntilClose": 3 }
        ]
      }
    },
    "weather": {
      "ok": true,
      "data": {
        "city":      { "id": 7, "name": "Raleigh", "weather_key": "raleigh-nc-us" },
        "summary":   { "temperature": 71, "unit": "F", "condition": "Clear", "iconKey": "clear" }
      }
    },
    "dailyQuote": {
      "ok": true,
      "data": { "text": "Make it simple enough to begin.", "author": "Unknown" }
    }
  }
}
```

**Field projection rules** (so the payload stays small — REQ-19.1):

- `tasks`: `id, title, priority, tag, reminder_at, status` only. Never include `description`, `comment`, `attachment_data`.
- `notes`: `id, title, updated_at`, plus a server-trimmed `excerpt` of at most 120 characters of `body` with HTML stripped using the same `stripHtml` helper used by tasks.
- `fast_access_bills`: `id, item, amount, due_date, pay_before`. `status` is implied (only `Unpaid` rows are returned).
- `credit_cards`: `id, name, total_balance, closing_date` for the approaching list; aggregates are pre-summed server-side as decimal strings.

**Behavior.**

- All per-card queries run in parallel via `Promise.allSettled`. (REQ-2.8)
- For each settled card: `{ ok: true, data }` on success; `{ ok: false, error: <string> }` on failure. The HTTP response is always `200` unless the request itself fails auth or throws unexpectedly.
- The endpoint sets `Cache-Control: no-store` (per-user data).
- Response is gzipped by Express's default middleware.

**Time-zone handling (REQ-17).**

Day boundaries are computed in **Node**, not Postgres, to keep the SQL portable:

```js
// Returns ISO timestamps for [startOfToday, endOfToday) in the given IANA tz.
function dayWindow(tz, daysFromToday = 0) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const ymd = fmt.format(new Date()); // "2026-05-30"
  // Build [start, end) in tz, then convert to UTC ISO via Intl + Date.
  // (Implementation uses a small utility; tested against fixtures for tz='America/New_York', 'Asia/Ho_Chi_Minh', 'UTC'.)
}
```

Day boundaries are passed to SQL as ISO strings. SQL queries compare against `tasks.reminder_at` and `fast_access_bills.due_date` as ranges. `due_date` is `TEXT` in the existing schema with format `'YYYY-MM-DD'`, so SQL compares lexicographically against `'YYYY-MM-DD'`-formatted strings derived from the window — no `AT TIME ZONE` needed.

**Performance.** Each query touches an index that already exists (`user_id`) plus simple range filters. The server's perf budget is **p95 < 600 ms** for typical user volumes (REQ-19.1 calls for 500 ms for the entire round trip, allowing ~100 ms of network).

### 3.2 `PUT /api/dashboard/preferences`

**Purpose.** Persist per-user customization (REQ-18).

**Body.**

```json
{
  "version": 1,
  "defaultLanding": "today" | "last_used",
  "cards": [
    { "id": "todaysTasks", "visible": true, "order": 0 },
    ...
  ]
}
```

**Validation.**

- `defaultLanding` must be one of `'today' | 'last_used'`.
- Every known card id must appear exactly once in `cards`. Unknown ids are dropped silently.
- `order` is normalized to `0..n-1` server-side.

**Response.** The same shape it persists, plus `{ updated_at: <ISO> }`.

### 3.3 `POST /api/dashboard/preferences/reset`

Clears `users.dashboard_preferences` to `NULL`. Subsequent reads return the server defaults (REQ-18.6).

### 3.4 New Socket.IO emits

Two existing handlers gain one emit each so the Dashboard can recompute affected cards without re-fetching the full payload (REQ-11.4, REQ-11.5):

| Existing handler | Add |
|---|---|
| `PUT /api/credit-cards/fast-access-bills/:id` (in `creditCards.routes.js`) | `emitToUser(req.session.userId, 'bill:updated', { bill: updatedBill })` |
| `POST /, PUT /:id, DELETE /:id` under `/api/credit-cards` (cards) | `emitToUser(req.session.userId, 'card:updated', { id })` after success |

No new emit is needed for tasks or notes — those events already exist.

**Event names** were chosen to match the existing `task:*` / `note:*` convention.

## 4. Backend file changes

| File | Change |
|---|---|
| `src/server/services/dailyQuote.service.js` (NEW) | Extract `fetchDailyQuote()` and `DEFAULT_DAILY_QUOTE` from `server.js` so the dashboard service and the existing `GET /api/daily-quote` handler share one implementation. `server.js` imports from here. |
| `src/server/services/dashboard.service.js` (NEW) | `createDashboardService({ allAsync, getAsync })` exporting `loadDashboard(userId, { tz, dueSoonDays })`. Internally splits work into `loadTodaysTasks`, `loadTaskStatusSummary`, `loadRecentNotes`, `loadBills`, `loadCreditCardSummary`, `loadWeatherCard`, and a passthrough to the daily quote service. Calls them with `Promise.allSettled`. |
| `src/server/routes/dashboard.routes.js` (NEW) | `createDashboardRouter({ authRequired, allAsync, getAsync, runAsync })` exposing: `GET /dashboard`, `PUT /dashboard/preferences`, `POST /dashboard/preferences/reset`. |
| `server.js` | (a) Import and mount the new router via `app.use('/api', createDashboardRouter({...}))`. (b) Replace the inline `fetchDailyQuote` / `DEFAULT_DAILY_QUOTE` with imports from `dailyQuote.service.js`. (c) Inside `initializeDatabase()`, add one idempotent migration: `ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB`. (d) In the existing notes routes, no change — `note:*` events are already emitted. |
| `src/server/routes/creditCards.routes.js` | Add `emitToUser(req.session.userId, 'bill:updated', { bill: updatedBill })` and `emitToUser(req.session.userId, 'card:updated', { id })` at the end of the relevant successful handlers. Import `emitToUser` from `../realtime`. |
| `src/server/realtime.js` | No code change. |

### 4.1 Sample query: today's tasks

The query reuses `tasks.service.js` style but is co-located in `dashboard.service.js` because it filters by a tz-aware window:

```js
// Pseudocode — actual code uses ?  placeholders rewritten by toPostgresSql.
SELECT id, title, priority, tag, reminder_at, status
FROM tasks
WHERE user_id = ?
  AND archived = 0
  AND (
    status = 'in_progress'
    OR (reminder_at >= ? AND reminder_at < ?)            -- today window
    OR (reminder_at IS NOT NULL AND reminder_at < ? AND status <> 'done') -- overdue
  )
ORDER BY reminder_at ASC NULLS LAST,
         CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END
LIMIT 30
```

The Node code then partitions the rows into `overdue / today / in_progress` and trims each subset to 5 (REQ-3.5).

## Data Models

**Decision: add a single `JSONB` column on `users`** (Option A) rather than a separate table.

Rationale:
- One row per user, one read alongside the dashboard payload (no extra join).
- No referential complexity (preferences are owned by the user; nothing references them).
- Idempotent migration via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

**Schema change** (added inside `initializeDatabase` in `server.js`, after the existing `ALTER TABLE users ...` lines):

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB
```

**Stored shape.**

```json
{
  "version": 1,
  "defaultLanding": "today",
  "cards": [
    { "id": "todaysTasks",        "visible": true,  "order": 0 },
    { "id": "taskStatusSummary",  "visible": true,  "order": 1 },
    { "id": "bills",              "visible": true,  "order": 2 },
    { "id": "creditCards",        "visible": true,  "order": 3 },
    { "id": "recentNotes",        "visible": true,  "order": 4 },
    { "id": "weather",            "visible": true,  "order": 5 },
    { "id": "dailyQuote",         "visible": true,  "order": 6 }
  ]
}
```

**Default order** (REQ-18.4): `todaysTasks → taskStatusSummary → bills → creditCards → recentNotes → weather → dailyQuote`.

**Read path.** `loadPreferences(userId)` returns the stored JSON merged on top of the defaults (so future card additions show up automatically for existing users). The merge picks any unknown card from defaults and appends it at the end with `visible: true`.

**Reset (REQ-18.6).** `POST /api/dashboard/preferences/reset` runs `UPDATE users SET dashboard_preferences = NULL WHERE id = ?` and returns the defaults.

**Satisfies:** REQ-18.

## 6. Real-time updates

The Dashboard module attaches its own listeners to the same socket that `connectRealtime()` in `app.js` already manages.

### 6.1 Listener lifecycle

- **Attach** when `showSection()` switches into the dashboard view.
- **Detach** when leaving the dashboard view (`disconnectRealtime` is not called — the socket stays connected for other views).

```js
// public/js/features/dashboard/dashboard.module.js
const subscribe = () => {
  if (!window.realtimeSocket) return;
  ['task:created', 'task:updated', 'task:deleted'].forEach((e) =>
    window.realtimeSocket.on(e, scheduleRefresh)
  );
  ['note:created', 'note:updated', 'note:deleted'].forEach((e) =>
    window.realtimeSocket.on(e, scheduleRefresh)
  );
  ['bill:updated', 'card:updated'].forEach((e) =>
    window.realtimeSocket.on(e, scheduleRefresh)
  );
};
```

`scheduleRefresh` uses the same 150 ms debounce pattern as `scheduleTaskRefresh` in `app.js`. After the debounce fires it calls `loadDashboard()` which performs the single aggregated `GET /api/dashboard` (REQ-11.2 to REQ-11.5, REQ-19.4).

### 6.2 Connection state UI

`socket.on('connect')` and `socket.on('disconnect')` events drive a small `aria-live="polite"` indicator in the dashboard header that shows "Live updates paused" while disconnected and clears on reconnect (REQ-11.7). On reconnect the dashboard re-fetches (REQ-11.7).

### 6.3 Vercel caveat

Socket.IO requires a persistent connection. On Vercel's serverless functions, live events do not flow. The dashboard remains functional without realtime — every section change re-fetches on view show, and the connection-state indicator reflects the disconnected state honestly. (Documented as an open risk in §16.)

**Satisfies:** REQ-11.

## 7. Frontend file changes

### 7.1 New module: `public/js/features/dashboard/dashboard.module.js`

```js
(function () {
  const create = ({ request, t, getLanguage, showStatusToast, openAddTask, openNewNote }) => {
    const root  = document.getElementById('dashboard-section');
    const grid  = root.querySelector('.dashboard-grid');
    const live  = root.querySelector('.dashboard-live-region');
    const customizeBtn = document.getElementById('dashboard-customize');

    let lastPayload = null;
    let refreshTimer = null;
    const scheduleRefresh = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => { refreshTimer = null; load({ silent: true }); }, 150);
    };

    const load = async ({ silent = false } = {}) => {
      if (!silent) renderSkeletons();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const payload = await request(`/api/dashboard?tz=${encodeURIComponent(tz)}`);
      if (payload.error) { renderError(payload.error); return; }
      lastPayload = payload;
      renderAll(payload);
    };

    const renderAll = (payload) => {
      grid.innerHTML = '';
      const order = payload.preferences.cards
        .filter((c) => c.visible)
        .sort((a, b) => a.order - b.order)
        .map((c) => c.id);
      order.forEach((id) => grid.append(renderCard(id, payload.cards[id])));
    };

    const renderCard = (id, card) => {
      // dispatch by id to renderTodaysTasks, renderTaskStatus, ...
    };

    const applyTranslations = () => { /* update card titles from t() */ };

    const bind = () => {
      customizeBtn.addEventListener('click', openCustomizePanel);
      // wire socket listeners on first show
    };

    const refresh = () => load({ silent: true });

    return { applyTranslations, bind, load, refresh };
  };

  window.DashboardModule = { create };
}());
```

Module shape mirrors `notes.module.js` and `creditCards.module.js`: factory returning `{ applyTranslations, bind, load, refresh }`. Mounted from `app.js`:

```js
const dashboardModule = window.DashboardModule.create({
  request,
  t,
  getLanguage: () => currentLanguage,
  showStatusToast,
  openAddTask: () => showAddTaskModal(),     // existing function
  openNewNote: () => { setCurrentView('notes'); showSection(); /* notesModule.addNote() pattern */ },
});
```

### 7.2 New section in `public/index.html`

Inserted near the existing sections:

```html
<section id="dashboard-section" class="card hidden" aria-labelledby="dashboard-title">
  <header class="dashboard-header">
    <h2 id="dashboard-title">Today</h2>
    <div class="dashboard-header-actions">
      <button id="dashboard-add-task"   class="task-action-icon"           aria-label="Add task" title="Add task">+</button>
      <button id="dashboard-new-note"   class="task-action-icon secondary" aria-label="New note" title="New note">✎</button>
      <button id="dashboard-customize"  class="task-action-icon secondary" aria-label="Customize" title="Customize">⚙</button>
    </div>
    <p class="dashboard-live-region" role="status" aria-live="polite"></p>
  </header>

  <div class="dashboard-grid"></div>
</section>
```

A new entry is added to the top nav (or the existing tab bar) with `data-task-tab="dashboard"`. The existing `taskSubtabs` listener handles it generically.

Asset references:

```html
<script src="js/features/dashboard/dashboard.module.js?v=dashboard-1"></script>
```

Stylesheet `?v=` and `sw.js` `CACHE_NAME` are bumped.

### 7.3 `public/app.js` edits

- Add `'dashboard'` to `VIEW_NAMES`.
- Add the dashboard branch in `showSection()`.
- Set the default initial view from preferences (after `init()` has the user, fetch `/api/dashboard` once and use `payload.preferences.defaultLanding`). When `defaultLanding === 'last_used'`, fall through to the existing `localStorage[SAVED_VIEW_KEY]`.
- Wire `dashboardModule.bind()` next to other `module.bind()` calls.
- Add new translation keys (see §10.2).
- In `connectRealtime()` (existing), no change: the dashboard subscribes to the existing `realtimeSocket` directly via the module.

## 8. Customization UI

A small modal opened from the dashboard header (`#dashboard-customize`). The modal contains:

- A `<select>` for **Default landing view** (`Today` / `Last used`).
- A list of cards, each row with:
  - A checkbox for `visible`.
  - Two buttons (`▲` / `▼`) to move the row up or down.
  - A localized card label.
- A primary `Save` button and a secondary `Reset to default` button.

**Why up/down rather than drag-and-drop:** drag-and-drop on iOS WebView requires either pointer events with custom autoscroll handling or a third-party library. Buttons are accessible by default, work with assistive tech, fit the existing modal-icon-action pattern, and keep v1 small. (REQ-18.1 — "reorder control" is satisfied either way.)

On Save the panel sends `PUT /api/dashboard/preferences` and triggers `dashboardModule.refresh()`. On Reset it calls `POST /api/dashboard/preferences/reset` and refreshes.

**Satisfies:** REQ-18.

## 9. CSS plan

All new rules live in `public/styles.css` and use existing theme tokens (`--bg`, `--surface`, `--surface-soft`, `--surface-tint`, `--primary`, `--primary-strong`, `--text`, `--muted`, `--border`, `--card-shadow`, `--success-*`, `--error-*`). No new color literals (REQ-15.3).

### 9.1 New class names

| Class | Purpose |
|---|---|
| `.dashboard-header` | Sticky header above the grid with backdrop blur (mirrors the iPhone `.task-column-header` sticky pattern). |
| `.dashboard-header-actions` | Inline-flex container for `+` / `✎` / `⚙`. |
| `.dashboard-live-region` | Visually hidden / muted style for SR announcements. |
| `.dashboard-grid` | CSS Grid container. Breakpoints below. |
| `.dashboard-card` | Per-card wrapper (rounded, bordered, themed). |
| `.dashboard-card-header` | Card title row + optional "View all" link. Not sticky. |
| `.dashboard-card-body` | Card content. |
| `.dashboard-empty` | Empty-state copy (centered, muted). |
| `.dashboard-error` | Per-card error state with Retry button. |
| `.dashboard-skeleton` | Pulsing placeholder shape. |
| `.dashboard-pill` | Small inline pill for counts/labels (reuses `.task-action-icon` sizing on mobile). |
| `.dashboard-quick-action` | Inline form host for Quick_Action submissions. |

### 9.2 Grid breakpoints (REQ-12.1, REQ-12.2)

```css
.dashboard-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;                 /* < 768px */
}
@media (min-width: 768px)  { .dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1200px) { .dashboard-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
```

### 9.3 Mobile / iOS chrome (REQ-12.3 to REQ-12.7)

- Grid container uses `min-height: calc(100dvh - <header offset>)` to keep the page reachable when iOS's URL bar collapses.
- Section padding uses `env(safe-area-inset-*)`.
- All buttons reuse `.task-action-icon` sizing (≥44pt).
- `.dashboard-header` uses `position: sticky; backdrop-filter: blur(6px) saturate(140%);` (matches the existing sticky pattern in `styles.css`).
- Skeletons and pills do not block touch scrolling.

### 9.4 Per-status accent reuse (REQ-3, REQ-13.6)

The Today's Tasks card reuses the existing per-status CSS variables introduced for the task columns:

```css
.dashboard-card[data-card="todaysTasks"] li[data-status="todo"]        { box-shadow: inset 4px 0 0 var(--status-todo-accent, var(--primary)); }
.dashboard-card[data-card="todaysTasks"] li[data-status="in_progress"] { box-shadow: inset 4px 0 0 var(--status-in_progress-accent, var(--primary)); }
.dashboard-card[data-card="todaysTasks"] li[data-status="done"]        { box-shadow: inset 4px 0 0 var(--status-done-accent, var(--primary)); }
```

(The accent variables already exist on `.task-column-{status}`; the dashboard reads them via `--status-accent` set on a parent `[data-status]`.)

### 9.5 Skeleton animation

CSS-only:

```css
.dashboard-skeleton {
  background: linear-gradient(90deg, var(--surface-soft) 0%, var(--surface) 50%, var(--surface-soft) 100%);
  background-size: 200% 100%;
  animation: dashboard-skeleton 1.4s linear infinite;
  border-radius: 8px;
  min-height: 14px;
}
@keyframes dashboard-skeleton { from { background-position: 200% 0; } to { background-position: -200% 0; } }
```

## 10. Accessibility & i18n

### 10.1 Accessibility (REQ-13)

- `<section role="region" aria-labelledby="...">` per card; the card title is the labelled element.
- One root `aria-live="polite"` region inside `.dashboard-header` announces real-time refresh ("Updated just now") and Quick_Action submissions ("Task added") (REQ-13.5).
- Every interactive control has a localized `aria-label` (icon-only buttons must — REQ-13.7).
- Keyboard order matches source order; focus is moved into the customize modal on open and restored on close.
- All status indicators (priority, overdue, paid/unpaid) carry a textual label in addition to color (REQ-13.6).

### 10.2 i18n (REQ-14)

New translation keys to add to `translations.en` and `translations.vi` in `public/app.js`:

| Key | English | Vietnamese |
|---|---|---|
| `dashboardTab` | Today | Hôm nay |
| `dashboardTitle` | Today | Hôm nay |
| `dashboardCustomize` | Customize | Tuỳ chỉnh |
| `dashboardCustomizeReset` | Reset to default | Khôi phục mặc định |
| `dashboardDefaultLanding` | Default landing view | Trang mặc định khi mở app |
| `dashboardDefaultLandingToday` | Today | Hôm nay |
| `dashboardDefaultLandingLastUsed` | Last used | Trang gần nhất |
| `dashboardLiveResumed` | Live updates resumed | Đã kết nối lại |
| `dashboardLivePaused` | Live updates paused | Tạm dừng cập nhật trực tiếp |
| `dashboardErrorTitle` | Dashboard could not be loaded | Không thể tải Dashboard |
| `dashboardRetry` | Retry | Thử lại |
| `cardTodaysTasks` | Today's tasks | Việc hôm nay |
| `cardTaskStatusSummary` | Task status | Trạng thái công việc |
| `cardRecentNotes` | Recent notes | Ghi chú gần đây |
| `cardBills` | Bills | Hóa đơn |
| `cardCreditCards` | Credit cards | Thẻ tín dụng |
| `cardWeather` | Weather | Thời tiết |
| `cardDailyQuote` | Daily quote | Câu nói hôm nay |
| `viewAllTasks` | View all tasks | Xem tất cả công việc |
| `viewAllNotes` | View all notes | Xem tất cả ghi chú |
| `viewAllBills` | View all bills | Xem tất cả hóa đơn |
| `subOverdue` | Overdue | Quá hạn |
| `subToday` | Today | Hôm nay |
| `subInProgress` | In progress | Đang làm |
| `subDueSoon` | Due soon | Sắp đến hạn |
| `subUndated` | Undated | Chưa có ngày |
| `closesInDays` | Closes in {n} days | Còn {n} ngày đến hạn chốt |
| `markPaid` | Mark paid | Đánh dấu đã trả |
| `quickAddTask` | Add task | Thêm việc |
| `quickNewNote` | New note | Ghi chú mới |
| `dashboardEmptyTasks` | No tasks for today | Hôm nay không có việc |
| `dashboardEmptyNotes` | No notes yet | Chưa có ghi chú |
| `dashboardEmptyBills` | No bills need attention | Không có hóa đơn cần xử lý |
| `dashboardEmptyCards` | No credit cards added | Chưa thêm thẻ tín dụng |
| `dashboardNoApproachingClose` | No closing dates approaching | Không có thẻ nào sắp đến ngày chốt |
| `dashboardEmptyWeather` | Add a city in Weather | Thêm thành phố trong tab Thời tiết |
| `dashboardWeatherUnavailable` | Weather unavailable | Không tải được thời tiết |
| `dashboardQuoteUnavailable` | Quote unavailable | Không tải được câu nói |
| `cardErrorRetry` | Couldn't load this card | Không thể tải thẻ này |

Numbers, dates, and currency are formatted with `Intl.*` using `currentLanguage`'s locale (existing pattern in `creditCards.formatters.js`).

## Correctness Properties

### Property 1: Single aggregated fetch per mount

**Validates: Requirements 19.1, 19.4**

The Dashboard issues exactly one `GET /api/dashboard` per mount, plus at most one debounced re-fetch per Socket.IO event burst (150 ms debounce window). No card runs its own background fetch. (REQ-19.1, REQ-19.4)

### Property 2: Per-user data scoping

**Validates: Requirements 2.3**

Every SQL query in `dashboard.service.js` filters by `user_id = $userId`. The router never accepts a user-id query parameter. The session middleware is the single source of truth for identity. (REQ-2.3)

### Property 3: Time-zone correctness

**Validates: Requirements 17.3, 2.5**

Day-window boundaries are computed in Node from the validated `tz` parameter. Bills (`due_date TEXT 'YYYY-MM-DD'`) are compared lexically; tasks (`reminder_at TIMESTAMP`) are compared as ranges. An invalid `tz` falls back to UTC and sets `timezoneFallback: true`. (REQ-17.3, REQ-2.5)

### Property 4: Partial failure resilience

**Validates: Requirements 2.8**

Per-card loaders run in `Promise.allSettled`. A failure in one loader returns `{ ok: false, error }` for that card while every other card still returns `{ ok: true, data }`. The HTTP response is `200` unless auth or the request itself fails. (REQ-2.8)

### Property 5: Bounded payload size

**Validates: Requirements 19.1**

Each card has a hard cap (5 rows for tasks/notes/bills; up to all closing cards for credit cards). Notes are server-trimmed to a 120-character HTML-stripped excerpt. Tasks omit `description`, `comment`, and `attachment_data`. (REQ-19.1)

### Property 6: Idempotent migration

**Validates: Requirements 18.4**

`ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB` is safe to run on every boot. `NULL` means "use defaults", and the read path merges defaults over stored JSON so newly added card ids appear automatically for existing users. (REQ-18.4)

### Property 7: Realtime listener lifecycle

**Validates: Requirements 11.6**

Dashboard listeners are attached on `showSection('dashboard')` and detached on leaving the dashboard view. The shared socket connection persists across views; only the dashboard-scoped handlers are removed. (REQ-11.6)

### Performance budgets (informative)

- Server: p95 < 600 ms on Supabase pooler with volumes from REQ-19.1.
- Client first paint: skeletons within one frame; cards within 1500 ms of the API response. (REQ-19.2)
- Client realtime apply latency: < 200 ms after the 150 ms debounce. (REQ-19.3)
- The client keeps `lastPayload` in memory for instant reuse on subsequent shows within the same session.

## Error Handling

| Card | Empty state copy key | Error state |
|---|---|---|
| Today's Tasks | `dashboardEmptyTasks` + Quick_Action `quickAddTask` | Per-card error chip + Retry. |
| Task Status Summary | `dashboardEmptyTasks` (renders only when all three counts are zero) + Quick_Action | Per-card error chip + Retry. |
| Recent Notes | `dashboardEmptyNotes` + Quick_Action `quickNewNote` | Per-card error chip + Retry. |
| Bills | `dashboardEmptyBills` (no Quick_Action — bills are seeded from defaults) | Per-card error chip + Retry. |
| Credit Cards | `dashboardEmptyCards` if zero cards; `dashboardNoApproachingClose` shown alongside totals when no card is within Due_Soon_Window | Per-card error chip + Retry. |
| Weather | `dashboardEmptyWeather` (links to Weather tab); `dashboardWeatherUnavailable` for upstream failure | Inline retry. |
| Daily Quote | `dashboardQuoteUnavailable` | Falls back to `DEFAULT_DAILY_QUOTE` from `dailyQuote.service.js`. |

If the entire Dashboard request fails (network or 5xx) the dashboard renders a single banner with the dashboardError keys (REQ-2.7, REQ-18.5).

**Satisfies:** REQ-16.

## 13. Migration / DB changes

Inside `initializeDatabase()` in `server.js`, add one statement after the existing `users` migrations:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB
```

No data backfill is required — `NULL` means "use defaults", and the read path merges in defaults for any missing card ids on the fly.

No destructive changes. All changes are idempotent and safe to re-run on existing data.

## Testing Strategy

### 14.1 Backend (Jest + supertest in `server.test.js`)

Add a new `describe('Dashboard API', ...)` block with at least these tests:

1. **Auth.** `GET /api/dashboard` without a session returns 401. `PUT /api/dashboard/preferences` and `POST /api/dashboard/preferences/reset` likewise.
2. **Aggregated payload shape.** Authenticated request returns 200 with `cards.{todaysTasks, taskStatusSummary, recentNotes, bills, creditCards, weather, dailyQuote}` keys, each with `{ ok: boolean, data | error }`.
3. **Time-zone correctness for "today".** Insert a task whose `reminder_at` is "today" in `America/New_York` but yesterday in UTC. Confirm `tz=America/New_York` lands the task in `cards.todaysTasks.data.today`, and `tz=UTC` does not.
4. **Due-soon window.** Insert a bill due in 2 days and another in 10 days; with `dueSoonDays=3`, only the 2-day one appears in `dueSoon`. With `dueSoonDays=14`, both appear.
5. **Partial failure resilience.** Stub one downstream service method to throw; the response still returns 200 with that card's `ok: false` and `error: <string>` while every other card has `ok: true`.
6. **Preferences round-trip.** `PUT /api/dashboard/preferences` then `GET /api/dashboard` reflects the new order and visibility. `POST /api/dashboard/preferences/reset` returns to defaults.
7. **Field projection.** Confirm `attachment_data`, `description`, `comment` are absent from the dashboard payload regardless of underlying task content.
8. **Excerpt trimming.** A note body of 500 characters surfaces a 120-character `excerpt` ending in `…`.
9. **Default landing fallback.** If a user hasn't set preferences, the response carries `preferences.defaultLanding === 'today'`.

Tests follow the existing patterns in `server.test.js`: `createAgent` for signup-auth, `await db.query(...)` for direct seeding/cleanup, `RUN_ID`-prefixed usernames for isolation.

### 14.2 Frontend manual test plan

The frontend has no test runner today; manual coverage is acceptable for v1. The plan:

1. **Default landing.** Fresh login → Dashboard.
2. **Each card renders** when populated and shows the correct empty state when not.
3. **Quick Add Task** opens the existing add-task modal with a tasks reload after submit.
4. **Quick New Note** routes into the Notes section (so the user can use the existing editor) and a freshly-created note appears in `recentNotes` after returning to the dashboard.
5. **Real time.** Open two browser tabs (or the iPhone PWA + a desktop tab) signed in as the same user; create/edit/delete a task in tab A and observe tab B's dashboard update within ~150 ms.
6. **Customize.** Toggle visibility off, save, refresh — card is gone. Toggle back, save — card returns. Reorder up/down — order persists across refresh. Reset clears.
7. **Default landing preference.** Set to "Last used", navigate to Notes, log out, log back in → Notes opens.
8. **Locale.** Switch to `vi`, verify all dashboard strings, dates, and currency.
9. **Theme.** Toggle dark mode, verify card chrome and skeletons in dark.
10. **iOS WebView.** Same flows on the deployed iOS wrapper. Verify safe-area, sticky header blur, and no horizontal scroll.
11. **Time zone.** Force-change device tz to `Asia/Ho_Chi_Minh`; tasks dated "today" reflect the new local day.
12. **Network errors.** Throttle to "Offline" in DevTools after first load → live indicator shows "Live updates paused"; re-online → dashboard re-fetches.

## 15. Out of scope

- Web push or APNs notifications for dashboard reminders.
- Multi-day calendar grid view of tasks.
- AI-generated summaries.
- Drag-and-drop card reorder (v2).
- Any change to the existing Tasks/Notes/Financial/Weather sections beyond the two new Socket.IO emits in §3.4.
- Replacing `localStorage[SAVED_VIEW_KEY]` semantics — the dashboard reads it but does not change it.

## 16. Open questions / risks

1. **Vercel cannot hold open WebSocket connections.** Socket.IO works locally and on persistent-connection hosts (Render, Railway, Fly.io). On Vercel the dashboard still works but live events do not flow; the connection-state indicator reflects this honestly. Mitigation: keep using the explicit `Live updates paused` state until the host changes. Tracked via the existing operational note in the project.
2. **Daily quote upstream failures** (`zenquotes.io`, `api.quotable.io`) are already handled by `DEFAULT_DAILY_QUOTE` in the existing `fetchDailyQuote()` helper; the dashboard inherits the same fallback once that helper moves into `dailyQuote.service.js`.
3. **Time-zone defaulting.** If the client doesn't send `tz` (older iOS WebViews), the server falls back to UTC and sets `timezoneFallback: true`. The client surfaces this as a small footer note in the customize panel only — it is intentionally not shown on the main dashboard so the day-to-day experience is not noisy.
4. **Customize ordering UX.** Up/down buttons are correct and accessible but slower than drag-and-drop. If usability testing shows people don't customize because of friction, a v2 can add drag-and-drop with autoscroll for iOS.
5. **`due_date` is `TEXT` (`'YYYY-MM-DD'`).** Lexical comparison works because the format is sortable, but any future change to free-text dates would break the bills "due_soon" query. Keep the column format strict.
6. **Admin user view.** The existing `/api/credit-cards` GET behaves differently for the admin user (returns admin's cards). The dashboard intentionally always shows the **signed-in user's own** credit cards, even for admin, to keep the dashboard a "personal" view. (Admin can switch tabs to see cross-user data.)
7. **Performance on cold Supabase pooler.** First request after idle can be slow. Cold-start mitigation is out of scope for this feature; we accept occasional warmups as long as p95 remains within budget.

---

**End of design.** This document is sized to be readable end-to-end in ~10 minutes and is detailed enough to drive the tasks phase without further design questions. Each section above maps back to specific REQ IDs from `requirements.md`.
