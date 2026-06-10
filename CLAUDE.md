# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this is

A full-stack task manager ("SmallPr") with one Express backend and **two frontends**:

- **Legacy vanilla-JS app** (`public/` + `public/js/`, ~10k lines) — the **primary production UI**, served at `/`. Covers all features: tasks, notes, dashboard, transactions, credit cards, admin, exports.
- **React app** (`client/src/`) — an incremental rewrite covering **auth + tasks only**, served at `/app`. Its build output is committed at `public/app/`.

Don't assume React is "the frontend" — most UI work happens in `public/js/`.

## Commands

```bash
npm run dev                  # backend, http://localhost:3000 (nodemon, auto-reload)
cd client && npm run dev     # React dev server :5173 (proxies /api + /socket.io to :3000)
npm test                     # jest (3 suites; server.test.js needs Postgres + Redis running)
cd client && npm run build   # emits to public/app/ — a COMMITTED artifact; rebuild + commit when client changes
npm run seed:audit-logs      # seed audit-log data
npm run eval:statement-import  # AI evaluation harness (see docs/AI_EVALUATION_HARNESS.md)
```

Requires PostgreSQL, Redis, and a `.env` file (see README.md "Set up environment variables"). Migrations run automatically on server start.

## Architecture map

- Entry: `server.js` → `app.js` → `src/server/bootstrap/{middleware,routes,sockets,health}.js`
- Request flow: `src/server/routes/*.routes.js` → `src/server/services/*.service.js` → `src/server/db/client.js`
- Dependency injection everywhere: factories receive `{ allAsync, getAsync, runAsync, queryAsync, ... }` — no service imports the db client directly
- Real-time: Socket.IO via the `src/server/realtime.js` singleton (`emitToUser`)
- Caching: Redis (`src/server/cache/redis.js`); a middleware clears the user's cache on any mutating `/api` request (see `setupCacheInvalidation` in `src/server/bootstrap/middleware.js`)
- Serving model: `express.static(public)` + a `*` fallback to `public/index.html`; the React build in `public/app/` rides along at `/app`

## Conventions

- Backend route files export `create<X>Router(deps)` factories, registered in `src/server/bootstrap/routes.js`
- **Mounting gotcha**: some routers mount at `/api` and declare full subpaths internally (tasks, dashboard, notes, admin, auth); others mount at `/api/<resource>` (credit-cards, transactions). Check `bootstrap/routes.js` before adding endpoints.
- Legacy frontend modules are IIFEs exposing `window.FeatureName = { create }`; `public/app.js` calls `create({ ...deps })` and wires them together. New legacy-UI behavior goes in a **new module under `public/js/`**, not into `app.js`. See `public/js/README.md`.
- Script tags in `public/index.html` carry `?v=cache-clear-...` params — **bump the param** on any script you edit, or clients keep the stale cached file.
- Validation uses Zod schemas in `src/server/schemas/`.

## More documentation

- `docs/ONBOARDING.md` — day-1 guide: two-frontends diagram, request lifecycle trace, module factory pattern
- `ARCHITECTURE.md` — system design
- `public/js/README.md` — legacy frontend module conventions
- `docs/AI_EVALUATION_HARNESS.md` — statement-import evaluation harness
- `docs/archive/` — stale historical reports; do not trust
