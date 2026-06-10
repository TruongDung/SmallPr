# Backend (`src/server/`)

Layered Express backend. A request flows:

```
app.js (middleware pipeline) → bootstrap/routes.js → routes/*.routes.js → services/*.service.js → db/client.js
```

- **bootstrap/** — app wiring: middleware pipeline, route registry, Socket.IO, health checks
- **routes/** — one file per resource, exporting a `create<X>Router(deps)` factory
- **services/** — business logic; receives db helpers (`allAsync`, `getAsync`, `runAsync`, ...) via injection, never imports the db client directly
- **db/** — Postgres client + migrations (run automatically on startup)
- **cache/** — Redis; user cache is auto-cleared on mutating `/api` requests

**Gotcha:** route mounting is mixed — some routers mount at `/api` and declare
full subpaths internally, others at `/api/<resource>`. Check
[bootstrap/routes.js](bootstrap/routes.js) before adding endpoints.

Full request-lifecycle walkthrough: [docs/ONBOARDING.md §3](../../docs/ONBOARDING.md#3-backend-request-lifecycle--trace-one-real-request).
