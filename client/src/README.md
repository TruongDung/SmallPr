# React client (`client/src/`)

The **incremental React rewrite** — covers **auth + tasks only**. The
production UI for everything else is the legacy vanilla-JS app in `public/`
(see [docs/ONBOARDING.md](../../docs/ONBOARDING.md)).

- Served at **`/app`** by the Express server; `vite.config.ts` sets `base: '/app/'`
- Dev: `npm run dev` → Vite on :5173, proxying `/api` + `/socket.io` to the backend on :3000
- Build: `npm run build` emits into **`../public/app/` — a committed artifact**; rebuild and commit whenever this directory changes
- Data fetching via TanStack Query (`hooks/`); real-time via Socket.IO (`hooks/useRealtime`)
