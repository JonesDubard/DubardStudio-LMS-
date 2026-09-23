# LearnGrid

LearnGrid is a white-label learning platform for Liberian schools. Each school gets its own subdomain and branding. Teachers publish lessons and assignments, students open them on a phone, and parents check upcoming work and grades. The app is meant to sit beside a school's existing administrative system, not replace it.

This repository is the foundation scaffold only: the Next.js app, tenant hostname resolution, Supabase client factories, and an empty folder map. Login, database tables, and persona screens are not built yet.

## Install

```bash
npm install
```

Copy `.env.example` to `.env.local` when you have a Supabase project. The placeholder home page runs without those values.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A school subdomain such as [http://pilotschool.localhost:3000](http://pilotschool.localhost:3000) shows that tenant label.

## Test

```bash
npm run test
```

End-to-end tests (none yet): `npm run test:e2e`

## Project structure

- `app/` — App Router. `(auth)` and `(platform)` are empty route groups. `(tenant)` holds empty groups for school admin, teacher, student, and parent.
- `middleware.ts` — Reads the hostname, sets `x-tenant-subdomain`, and refreshes the Supabase session.
- `components/` — Empty folders for shared, student, teacher, and admin UI.
- `lib/supabase/` — Browser, server, and session-refresh client factories.
- `lib/tenant/` — Hostname to subdomain resolution.
- `lib/queries/` and `lib/stubs/` — Empty until data access exists.
- `design/` — Empty landing place for future HTML mockups and wireframes.
- `docs/` — Product docs and `teaching.md`.
- `supabase/migrations/` — Empty until the schema is written.
- `tests/unit`, `tests/e2e`, `tests/rls` — Unit tests now; e2e and RLS later.
