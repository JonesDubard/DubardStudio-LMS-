# Teaching notes — foundation scaffold

Last updated: 2026-09-23

This file is the running developer guide. Future sessions should append what changed, what was skipped, and why.

## How to run this project

From the repository root:

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Copy `.env.example` to `.env.local` when a Supabase project exists. The placeholder page runs without those values. On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

Other commands:

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint through `next lint` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright. No tests yet, so this passes with no tests |
| `npm run format` | Prettier |
| `npm run db:types` | Stub. Prints a message until migrations exist |

## The big picture

LearnGrid is a white-label LMS for Liberian schools. Each school is a tenant, reached by a subdomain such as `pilotschool.ourlms.com`. The product docs in `docs/ia.md`, `docs/flows.md`, `docs/data-model.md`, and `docs/living-doc.md` describe five personas (platform admin, school admin, teacher, student, parent) sharing one academic data model. Isolation will be Postgres row-level security on `tenant_id`, not application filters.

This session only built the shell: the Next.js app, empty route groups, Supabase client factories, hostname-to-subdomain resolution, a neutral branding token set, a service worker that caches nothing, and CI. There is no login, no database, and no persona screens.

A later session on the same day added the four student P0 screens as server components fed by stubs. Login, database queries, and the other personas are still absent.

## File map

### Created

| File | Purpose |
|---|---|
| `package.json` | Scripts and dependencies for Next.js 15, Supabase, Serwist, Dexie, Tailwind, Vitest, and Playwright |
| `package-lock.json` | Locked install for `npm ci` |
| `tsconfig.json` | TypeScript with `strict: true` and the `@/*` path alias |
| `next.config.js` | Supabase Storage image hosts, Serwist wrapper, dev-origin and tracing fixes |
| `tailwind.config.ts` | Maps `brand.primary`, `brand.secondary`, `brand.bg`, and `brand.text` to CSS variables |
| `postcss.config.js` | Tailwind and Autoprefixer |
| `.eslintrc.json` | Next.js core web vitals, TypeScript, and Prettier |
| `.prettierrc` | Prettier defaults for this repo |
| `.prettierignore` | Keeps format from rewriting generated files, `designs/`, and `Livedoc/` |
| `.gitignore` | Ignores `node_modules`, `.next`, `.env*`, `.vercel`, and the compiled service worker |
| `.env.example` | Placeholders for the Supabase URL, anon key, service role key, and `NEXT_PUBLIC_ROOT_DOMAIN=ourlms.com` |
| `next-env.d.ts` | Next.js TypeScript references |
| `vitest.config.ts` | Runs `tests/unit/**/*.test.ts` |
| `playwright.config.ts` | Points e2e tests at `tests/e2e` and `http://localhost:3000` |
| `README.md` | Replaced the one-line title placeholder with install, run, test, and structure |
| `.github/workflows/ci.yml` | `npm ci`, lint, typecheck, and unit test. RLS step is commented out |
| `middleware.ts` | Reads the host, sets `x-tenant-subdomain`, refreshes the Supabase session |
| `app/layout.tsx` | Root HTML shell. Imports global CSS |
| `app/page.tsx` | Placeholder. Prints the tenant label and "Foundation scaffold running" |
| `app/globals.css` | Tailwind layers and the neutral gray brand variables |
| `app/manifest.ts` | Placeholder PWA manifest |
| `app/sw.ts` | Service worker stub. Registers, precaches nothing, no runtime cache |
| `app/(auth)/.gitkeep` | Empty login / invite / reset route group |
| `app/(platform)/.gitkeep` | Empty platform admin route group |
| `app/(tenant)/(school-admin)/.gitkeep` | Empty school admin route group |
| `app/(tenant)/(teacher)/.gitkeep` | Empty teacher route group |
| `app/(tenant)/(student)/.gitkeep` | Empty student route group |
| `app/(tenant)/(parent)/.gitkeep` | Empty parent route group |
| `components/shared/.gitkeep` | Cross-persona components, empty |
| `components/student/.gitkeep` | Student components, empty |
| `components/teacher/.gitkeep` | Teacher components, empty |
| `components/admin/.gitkeep` | Admin components, empty |
| `lib/supabase/client.ts` | Browser Supabase client factory |
| `lib/supabase/server.ts` | Server Supabase client factory using cookies |
| `lib/supabase/middleware.ts` | Session refresh helper used by middleware |
| `lib/tenant/resolve.ts` | Hostname to subdomain, or null for the root site |
| `lib/queries/.gitkeep` | Data fetchers later |
| `lib/stubs/.gitkeep` | Stubs later |
| `design/mockups/.gitkeep` | Landing folder for future HTML mockups |
| `design/wireframes/.gitkeep` | Landing folder for future wireframes |
| `supabase/migrations/.gitkeep` | SQL migrations later |
| `public/.gitkeep` | Public assets folder. Compiled `sw.js` is gitignored |
| `tests/unit/resolve-tenant.test.ts` | Unit tests for subdomain resolution |
| `tests/e2e/.gitkeep` | Playwright tests later |
| `tests/rls/.gitkeep` | RLS isolation tests later |
| `docs/teaching.md` | This file |

### Skipped

| Path | Reason |
|---|---|
| `docs/ia.md` | Already had the information architecture. Not overwritten |
| `docs/flows.md` | Already had the persona flows. Not overwritten |
| `docs/data-model.md` | Already had the draft schema. Not overwritten |
| `docs/living-doc.md` | Already had the product and tech review. Not overwritten |
| `designs/mockups/*` | Existing HTML mockups. Left in place. See decisions |
| `Livedoc/` | Separate copy of the product docs. Not part of this scaffold |
| `app/middleware.ts` | Not created. Next.js does not run middleware from `app/`. The working file is root `middleware.ts` |

### Student P0 screens (2026-09-23)

| File | Purpose |
|---|---|
| `app/(student)/layout.tsx` | Phone frame (`max-w-[390px]`) and `BottomNav` for the student routes |
| `app/(student)/feed/page.tsx` | Student home. Reads `getStudentFeed()` |
| `app/(student)/lessons/[lessonId]/page.tsx` | Lesson viewer. Reads `getLesson(lessonId)` |
| `app/(student)/assignments/[assignmentId]/page.tsx` | Assignment detail. Reads `getAssignment(assignmentId)` |
| `app/(student)/assignments/[assignmentId]/status/page.tsx` | Submission status. Reads `getSubmissionStatus(assignmentId)` |
| `lib/stubs/get-student-feed.ts` | `getStudentFeed()` returns a `StudentFeed`. `items` is the today list: Mathematics — Fractions, then English — Reading Response. Also returns the greeting and the two recently viewed rows |
| `lib/stubs/get-lesson.ts` | `getLesson(lessonId)` returns the Week 3 fractions lesson, including the two paragraphs, image caption, PDF, and external video |
| `lib/stubs/get-assignment.ts` | `getAssignment(assignmentId)` returns English — Reading Response: due date, instructions, Reading Passage.pdf, and the empty answer/file area |
| `lib/stubs/get-submission-status.ts` | `getSubmissionStatus(assignmentId)` returns the received submission: Sep 23, 1:42 PM, status SUBMITTED, written answer, and Reading Response.pdf |
| `components/student/BottomNav.tsx` | Home / Classes / Grades bar. Used by `app/(student)/layout.tsx` on all four screens. Home is marked Current, matching the mockups |
| `components/student/FeedCard.tsx` | Today card on the feed. Used twice: the new lesson and the due assignment |
| `components/student/RecentlyViewedRow.tsx` | Compact lesson row. Used twice in the feed's recently viewed list |
| `components/student/StatusBadge.tsx` | DUE SOON on the feed and assignment, READY on the lesson, SUBMITTED on the status page |
| `components/student/MaterialRow.tsx` | Title, meta, and action. Used for the lesson PDF and video, the assignment PDF, and the submitted attachment |
| `components/shared/PageHeader.tsx` | Greeting header on the feed. Section header (mark, subject, title) on the lesson, assignment, and status pages |
| `components/shared/PrimaryButton.tsx` | Dark full-width action. Open Lesson, Back to Learning Feed, and Submit Work |

Mockup matched by content: `design/mockups/student-assignment-submission-status.html` (the prompt name `student-submission-status.html` is not the filename on disk).

Left in the page, not extracted, because each appears on only one screen: feed sections, lesson body, offline note, assignment instructions, answer box, file row, submission confirmation, assignment summary, and the waiting-for-review block.

## Request lifecycle

1. The browser requests a host, for example `http://pilotschool.localhost:3000/` or `http://localhost:3000/`.
2. `middleware.ts` reads the `Host` header and calls `resolveTenantSubdomain`.
3. A school label such as `pilotschool` is written onto the request as `x-tenant-subdomain`. The bare root domain, `www`, and plain `localhost` do not set that header.
4. `lib/supabase/middleware.ts` refreshes the Supabase session cookie when the URL and anon key are set. With empty env values it returns the request unchanged.
5. `app/page.tsx` is a server component. It reads `x-tenant-subdomain` from `headers()` and renders `Tenant: pilotschool` or `Tenant: root`, plus `Foundation scaffold running`.
6. The response is HTML. No database lookup happens.

Student feed, after the same middleware step:

1. The browser requests `http://pilotschool.localhost:3000/feed`.
2. `middleware.ts` reads `Host`, resolves `pilotschool`, and sets `x-tenant-subdomain`.
3. `app/(student)/feed/page.tsx` calls `getStudentFeed()` in `lib/stubs/get-student-feed.ts`.
4. The stub returns hardcoded mockup copy. It does not read Supabase or filter by tenant.
5. The page renders `PageHeader`, two `FeedCard`s, the recently viewed rows, and `BottomNav` from the student layout.

Lesson, assignment, and status follow the same path. The page awaits `params`, then calls `getLesson`, `getAssignment`, or `getSubmissionStatus` with that id. The stub still returns the one mockup record.

## If this breaks, look here

| Symptom | Look here |
|---|---|
| `Tenant: root` on `pilotschool.localhost` | `middleware.ts` must read the `Host` header. `nextUrl.hostname` is rewritten to `localhost` in dev. Then check `lib/tenant/resolve.ts` |
| Page fails before any school exists | Supabase URL or anon key is empty. Middleware skips refresh on purpose. Calling `createClient()` throws until `.env.local` is filled |
| `npm run build` says it cannot find `self.__SW_MANIFEST` | `app/sw.ts` must contain that identifier so Serwist can compile. Do not pass it to `precacheEntries` until lesson caching is real |
| Dev server blocks `*.localhost` | `allowedDevOrigins` in `next.config.js` |
| Next warns that the workspace root is the parent folder | `outputFileTracingRoot` in `next.config.js`. A `package-lock.json` exists in the parent `dubardstudio` folder |
| `npm run lint` warns that `next lint` is deprecated | Expected on Next.js 15. The command still exits 0. Next.js 16 removes it |
| `npm run db:types` does not generate types | It is a stub until `supabase/migrations` has SQL |
| CI fails on `npm run test:rls` | That step is commented out until migrations and RLS policies exist |
| Feed shows wrong data | `lib/stubs/get-student-feed.ts`, `app/(student)/feed/page.tsx` |
| Styling looks off | `components/student/*`, `components/shared/PageHeader.tsx`, `components/shared/PrimaryButton.tsx`, `tailwind.config.ts`. Mockup grays are arbitrary values (`#E5E5E5`, `#999999`, `#666666`, `#333333`), not `gray-*` utilities |
| Tenant name wrong in header | `middleware.ts`. The prompt named `app/middleware.ts`; that file does not exist and Next.js would not run it. Student headers currently show the mockup labels (Student Home, Mathematics, English), not the subdomain |

## Key concepts

**RLS.** Row Level Security is a Postgres rule on a table. When it lands, every tenant-scoped table will require `tenant_id`, and policies will read `tenant_id` from the Supabase JWT. Application filters are not isolation. No policies exist yet.

**tenant_id.** The school’s id in the database. This scaffold does not look a subdomain up in Postgres. It only extracts the label and puts it on the request. A later session maps that label to a `tenants` row and then to `tenant_id`.

**Server vs client components.** `app/page.tsx` and `app/layout.tsx` are server components. They can read headers and cookies. `lib/supabase/client.ts` is for browser code and must not be imported into a server-only module by accident. `lib/supabase/server.ts` uses `cookies()` from `next/headers` and only runs on the server.

## Verification on 2026-09-23

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run lint` | Passed. Deprecation warning for `next lint`. No ESLint errors |
| `npm run test` | Passed. 5 tests in `tests/unit/resolve-tenant.test.ts` |
| `npm run build` | Passed. `/` is dynamic. Middleware is included. Serwist bundles `/sw.js` |
| `http://localhost:3000` | `Tenant: root` and `Foundation scaffold running` |
| `http://pilotschool.localhost:3000` | `Tenant: pilotschool` and `Foundation scaffold running` |

Checked with curl against the dev server. No in-editor browser tool was available.

## Decisions log

Items marked **Not in the prompt** need a human review. The others follow the session instructions.

### 2026-09-23 — Followed the prompt

- Foundation only. No auth screens, migrations, RLS, persona pages, real components, queries, or offline lesson caching.
- Supabase clients use `@supabase/ssr` (`createBrowserClient` / `createServerClient`). No auth redirects.
- Brand CSS variables default to a neutral gray, matching the unbranded fallback in the product docs (FR-2.3.5). The placeholder page does not add extra styling.
- CI runs install, lint, typecheck, and unit test. `npm run test:rls` stays commented out.
- `db:types` prints a stub message and exits 0.

### 2026-09-23 — Not in the prompt

- **Middleware path.** The prompt asked for `app/middleware.ts`. Next.js only executes `middleware.ts` at the repository root (or under `src/`). The file is root `middleware.ts`. Putting it in `app/` would not run, and `pilotschool.localhost` would stay `root`.
- **Next.js 15.5, not 16.** Next.js 16 renames middleware to `proxy.ts` and removes `next lint`. This repo stays on 15 so `.eslintrc.json` and `middleware.ts` match the prompt. `npm run lint` prints a deprecation warning and still passes.
- **Tailwind 3.** The prompt asked for `tailwind.config.ts` and `postcss.config.js`. That is the Tailwind 3 setup. Tailwind 4 was not installed.
- **Host header, not `nextUrl.hostname`.** In dev, a request to `pilotschool.localhost` still reports `nextUrl.hostname` as `localhost`. Middleware reads the `Host` header, which still says `pilotschool.localhost`.
- **`localhost` is also a root domain.** `NEXT_PUBLIC_ROOT_DOMAIN` is `ourlms.com`, but the verification host is `pilotschool.localhost`. Resolution treats `localhost` as a root in addition to the configured domain. `www` on either root is the root site. A host with more than one label before the root (`a.b.ourlms.com`) returns null until custom domains exist.
- **Empty Supabase env skips session refresh.** `createClient()` still throws if called without the URL and anon key. Middleware does not, so the placeholder page loads before credentials exist.
- **Serwist caches nothing, but the build must see `self.__SW_MANIFEST`.** The worker discards the injected list. `precacheEntries` and `runtimeCaching` are empty. Serwist is disabled when `NODE_ENV` is `development` so the dev server is not intercepted. Re-enable real caching with lesson pages.
- **Dexie is installed and unused.** It is in the locked stack for later offline lesson storage. No Dexie code was added.
- **`app/layout.tsx` was required.** Next.js will not render `app/page.tsx` without a root layout. Title and description use the LearnGrid name from `docs/living-doc.md` section 11.
- **Home page is `force-dynamic`.** Reading `headers()` already opts the route into dynamic rendering. The export keeps a future edit from accidentally static-rendering every host as `root`.
- **`allowedDevOrigins: ["*.localhost"]`.** Lets the dev server accept `pilotschool.localhost`.
- **`outputFileTracingRoot`.** A lockfile in the parent `dubardstudio` folder made Next treat that folder as the workspace root. Tracing is pinned to this app.
- **Image config uses `images.remotePatterns` for `*.supabase.co`.** `images.domains` is the older API. Paths are limited to `/storage/v1/object/**`.
- **Unit test and test configs.** `npm run test` needs a test, so subdomain resolution is covered. `vitest.config.ts` and `playwright.config.ts` exist so the scripts have a config. There are no end-to-end tests yet.
- **`.gitignore` un-ignores `.env.example`.** The required `.env*` pattern would also ignore the example. `!.env.example` keeps it committable. Compiled Serwist files and test output are ignored too.
- **`.prettierignore`.** Stops `npm run format` from rewriting the existing HTML mockups and the `Livedoc/` copy.
- **Two mockup folders.** The prompt asked for `design/mockups/`. The repo already had HTML mockups in `designs/mockups/`. Those files were not moved or overwritten. `design/mockups/` is an empty landing folder. Decide later whether to consolidate.
- **Packages from the living doc that were not installed.** React Hook Form, Zod, TanStack Query, and Resend are decided in `docs/living-doc.md` but were outside this session’s package list.
- **TypeScript 5.9, Vitest 3, ESLint 8.** Unpinned installs pulled TypeScript 6 and Vitest 5. They are pinned so they stay compatible with Next.js 15 and `.eslintrc.json`. `eslint-config-prettier` is v9 so it matches ESLint 8.

### 2026-09-23 — Student screens. Not in the prompt

- **Routes live in `app/(student)/`, not `app/(tenant)/(student)/`.** This session's table asked for `app/(student)/feed` and the other three paths. The empty foundation group `app/(tenant)/(student)/` was left as-is. Route groups do not appear in the URL, so the pages are `/feed`, `/lessons/1`, `/assignments/1`, and `/assignments/1/status`.
- **`app/(student)/layout.tsx`.** The phone frame and bottom nav are shared by all four mockups. A student layout keeps that chrome off the foundation home page.
- **`getStudentFeed()` returns an object, not only an array.** `items` is the today array. Greeting, date, and recently viewed rows are on the same object so the page does not hardcode mockup copy.
- **Sample strings come from the HTML, not the prompt example.** The prompt mentioned "Mathematics — Week 3 Quiz". That sentence is not in the mockups. The feed lesson is "Mathematics — Fractions".
- **Once-only blocks stayed in the page.** The extraction list named lesson body, instructions, answer field, and confirmation cards. Each is used on one screen, so they were not given their own files. `StatusBadge`, `MaterialRow`, and `RecentlyViewedRow` were extracted because the same markup is repeated.
- **Submit Work does not navigate or save.** It is a button with no handler. Download, View Image, Watch Video, and Choose File are the same. Open Lesson, Open Assignment, and Back to Learning Feed are static links. Link versions add `block text-center` so the anchor fills the row the way the mockup button does.
- **Checked with curl.** No in-editor browser was available. All four `pilotschool.localhost:3000` routes returned the mockup text. `npm run typecheck`, `npm run lint`, and `npm run build` passed.
