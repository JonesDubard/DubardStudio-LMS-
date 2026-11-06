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

## Local database (Supabase)

Needs Docker Desktop running and the Supabase CLI.

```
supabase start      # start local Supabase (first run downloads images)
supabase db reset   # rebuild the local database from supabase/migrations
```
Local API: http://127.0.0.1:54321 · Studio: http://127.0.0.1:54323

For the scripts, create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<"Secret" key printed by supabase start>
```
Seed test data: `npm run seed:dev`, then `npx tsx scripts/spike-second-tenant.ts`.

Rules:
- New migrations go in `supabase/migrations/` named `NNNN_name.sql` (digits, then `_`).

`supabase db reset` also loads `supabase/seed.sql`: two schools with one login per role, plus a Platform Admin.
 
## Local dev data
 
The same logins exist locally and on the shared dev project (learngrid-dev). They are test accounts only; never reuse these passwords anywhere real.
 
| School | Subdomain | Role | Email | Password |
|---|---|---|---|---|
| Pilot School #1 | `pilot1` | School Admin | `admin@pilot1.test` | `Pilot-School-1` |
| | | Teacher | `teacher@pilot1.test` | `Pilot-School-1` |
| | | Student | `student@pilot1.test` | `Pilot-School-1` |
| | | Parent | `parent@pilot1.test` | `Pilot-School-1` |
| Pilot School #2 | `pilot2` | School Admin | `admin@pilot2.test` | `Pilot-School-2` |
| | | Teacher | `teacher@pilot2.test` | `Pilot-School-2` |
| | | Student | `student@pilot2.test` | `Pilot-School-2` |
| | | Parent | `parent@pilot2.test` | `Pilot-School-2` |
| (none) | | Platform Admin | `platform@liberia-lms.test` | `Platform-Admin-1` |
 
Each school has an academic year and terms, a class, a subject and course, lessons (one still a draft), materials, and assessments with a submission and grades. See `supabase/seed.sql` for the details. Use School #2 to check that School #1 can't see its data.
 
When a migration adds a table, add rows for it to `supabase/seed.sql`.
 
## Dev project
 
The dev database is built from `supabase/migrations/`, with its history recorded (reset on 6 Nov 2026). After a migration PR is merged:
```
supabase db push --dry-run   # check what will be applied
supabase db push
```
Never run `supabase db reset --linked`: it wipes dev.
