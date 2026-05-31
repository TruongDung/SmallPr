# Database Migrations

This folder is the migration home for the PostgreSQL schema.

The app still runs the existing compatibility initializer in `src/server/db/initialize.js`
so existing local and test databases keep booting without a separate migration command.
New schema changes should be added here first, then wired to a migration runner such as
`node-pg-migrate`, `Knex`, `Drizzle`, or `Prisma` before production deployment.

Recommended next step:

```sh
npm install node-pg-migrate --save-dev
```

Then add scripts similar to:

```json
{
  "migrate": "node-pg-migrate up",
  "migrate:down": "node-pg-migrate down"
}
```
