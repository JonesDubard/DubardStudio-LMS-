# Teaching notes — foundation scaffold

Last updated: 2026-10-01

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
| `npm run test:e2e` | Playwright. `tests/e2e/auth-jwt.spec.ts` is the JWT → RLS spike |
| `npm run seed:dev` | Creates the pilot tenant and one user per persona. Prints passwords |
| `npm run format` | Prettier |
| `npm run db:types` | Stub. Prints a message until migrations exist |

## The big picture

LearnGrid is a white-label LMS for Liberian schools. Each school is a tenant, reached by a subdomain such as `pilotschool.ourlms.com`. The product docs in `docs/ia.md`, `docs/flows.md`, `docs/data-model.md`, and `docs/living-doc.md` describe five personas (platform admin, school admin, teacher, student, parent) sharing one academic data model. Isolation will be Postgres row-level security on `tenant_id`, not application filters.

This session only built the shell: the Next.js app, empty route groups, Supabase client factories, hostname-to-subdomain resolution, a neutral branding token set, a service worker that caches nothing, and CI. There is no login, no database, and no persona screens.

The 2026-10-01 auth spike added real sign-in, invite, and reset pages, session middleware, and the JWT hook migration. The claim chain is not proven yet. See "What the auth spike proved".

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
| `components/student/MaterialRow.tsx` | Title, meta, and action. Used for the lesson PDF and video, the assignment PDF, and the submitted attachment |
| `components/shared/PageHeader.tsx` | Greeting header on the feed. Section header (mark, subject, title) on the lesson, assignment, and status pages |
| `components/shared/PrimaryButton.tsx` | Dark full-width action. Open Lesson, Back to Learning Feed, and Submit Work |
| `components/shared/StatusBadge.tsx` | Student tones (`due`, `dueOnLight`, `submitted`, `ready`) plus generic Teacher/Admin chips. Student-only `components/student/StatusBadge.tsx` was merged here in the final verification audit |

Mockup matched by content: `design/mockups/student-assignment-submission-status.html` (the prompt name `student-submission-status.html` is not the filename on disk).

Left in the page, not extracted, because each appears on only one screen: feed sections, lesson body, offline note, assignment instructions, answer box, file row, submission confirmation, assignment summary, and the waiting-for-review block.

### Teacher P0 screens (2026-09-24)

| File | Purpose |
|---|---|
| `app/teacher/layout.tsx` | Side nav shell. Renders `TeacherSideNav` on the left and `{children}` on the right |
| `app/teacher/home/page.tsx` | Teacher home. Reads `getTeacherHome()` |
| `app/teacher/lessons/new/page.tsx` | Lesson editor. Reads `getLessonForEdit("new")`, renders `LessonEditorForm` |
| `app/teacher/assignments/new/page.tsx` | Assignment creator. Reads `getAssignmentForEdit("new")`, renders `AssessmentForm` |
| `app/teacher/assignments/[assignmentId]/submissions/page.tsx` | Submission grading. Reads `getSubmissionsForAssessment(assignmentId)` |
| `app/teacher/assessments/[assessmentId]/grade-entry/page.tsx` | Score-only grade entry. Reads `getGradeEntryRoster(assessmentId)` |
| `app/teacher/lessons/[lessonId]/reuse/page.tsx` | Lesson reuse panel. Reads `getLessonForReuse(lessonId)` |
| `lib/stubs/get-teacher-home.ts` | `getTeacherHome()` returns classes, pending grading rows, and upcoming assignments |
| `lib/stubs/get-lesson-for-edit.ts` | `getLessonForEdit(lessonId)` returns one lesson draft with class/subject/term options, materials, and video URL |
| `lib/stubs/get-assignment-for-edit.ts` | `getAssignmentForEdit(assignmentId)` returns an `Assessment` (type assignment) plus linked lesson fields and one material |
| `lib/stubs/get-submissions-for-assessment.ts` | `getSubmissionsForAssessment(assessmentId)` returns the assignment `Assessment`, submission list, and selected submission detail |
| `lib/stubs/get-grade-entry-roster.ts` | `getGradeEntryRoster(assessmentId)` returns a quiz `Assessment` and roster rows for score entry |
| `lib/stubs/get-lesson-for-reuse.ts` | `getLessonForReuse(lessonId)` returns the published lesson plus available terms and draft preview |
| `components/teacher/TeacherSideNav.tsx` | Left nav. Used by `app/teacher/layout.tsx` on every Teacher page |
| `components/teacher/ClassCard.tsx` | Class tile. Used three times on Teacher Home |
| `components/teacher/GradingQueueRow.tsx` | Pending grading table row. Used twice on Teacher Home |
| `components/teacher/SubmissionList.tsx` | Left column student list on submission grading |
| `components/teacher/SubmissionDetail.tsx` | Right column grade + feedback form (client). Used on submission grading |
| `components/teacher/GradeEntryTable.tsx` | Bulk score entry table (client). Used on grade entry |
| `components/teacher/AssessmentForm.tsx` | Assignment create form (client). Used on `/teacher/assignments/new` |
| `components/teacher/LessonEditorForm.tsx` | Lesson create form (client). Used on `/teacher/lessons/new` |
| `components/shared/StatusBadge.tsx` | Status chip. Used on Teacher Home upcoming rows, lesson draft badge, submission pending badge, and submission list statuses |

#### Final Teacher route map

Teacher routes live under a real `/teacher` path segment (`app/teacher/`, not a route group). Student home remains `/feed`. Student lesson and assignment URLs (`/lessons/1`, `/assignments/1`, `/assignments/1/status`) stay unprefixed and do not collide with Teacher paths.

| URL | Page |
|---|---|
| `/teacher/home` | Teacher Home |
| `/teacher/lessons/new` | Create Lesson |
| `/teacher/assignments/new` | Create Assignment |
| `/teacher/assignments/1/submissions` | Submission grading |
| `/teacher/assessments/1/grade-entry` | Score-only grade entry |
| `/teacher/lessons/1/reuse` | Lesson reuse |

`components/shared/PrimaryButton.tsx` already existed from the Student session. Teacher primary actions keep the mockup button classes (`border border-[#333333] bg-[#333333] text-white px-5 py-3`) instead of the Student full-width feed/page variants.

`design/mockups/components-extraction-list.md` had no Teacher section (only Student and School Admin). Extraction followed the session expected component list and the six `teacher-*.html` mockups.

### School Admin P0 screens (2026-09-24)

| File | Purpose |
|---|---|
| `app/(admin)/layout.tsx` | Side nav shell. Renders `AdminSideNav` on the left and `{children}` on the right |
| `app/(admin)/admin/dashboard/page.tsx` | School Admin dashboard. Reads `getAdminDashboard()` |
| `app/(admin)/admin/branding/page.tsx` | School branding. Reads `getSchoolBranding()` |
| `app/(admin)/admin/academic/page.tsx` | Academic setup. Reads `getAcademicStructure()` |
| `app/(admin)/admin/people/teachers/page.tsx` | Teachers list + CSV import. Reads `getTeachers()` |
| `app/(admin)/admin/people/students/page.tsx` | Students list + CSV import. Reads `getStudents()` |
| `app/(admin)/admin/people/admins/page.tsx` | School Admins list. Reads `getSchoolAdmins()` |
| `app/(admin)/admin/people/parents/page.tsx` | Parent-child linking. Reads `getParents()` |
| `app/(admin)/admin/assignments/page.tsx` | Assignments overview. Reads `getAdminAssignments()` |
| `lib/stubs/get-admin-dashboard.ts` | `getAdminDashboard()` returns setup progress, summary tiles, and usage metrics |
| `lib/stubs/get-school-branding.ts` | `getSchoolBranding()` returns logo/favicon labels, color swatches, and student preview copy |
| `lib/stubs/get-academic-structure.ts` | `getAcademicStructure()` returns progress steps, years, terms, classes, and subjects |
| `lib/stubs/get-teachers.ts` | `getTeachers()` returns teacher rows and CSV preview (`TeachersList`) |
| `lib/stubs/get-students.ts` | `getStudents()` returns student rows, CSV preview, and parent-linking note (`StudentsList`) |
| `lib/stubs/get-school-admins.ts` | `getSchoolAdmins()` returns admin rows and access note (`SchoolAdminsList`) |
| `lib/stubs/get-parents.ts` | `getParents()` returns parent list, selected parent, linked children, and search result (`ParentsData`) |
| `lib/stubs/get-admin-assignments.ts` | `getAdminAssignments()` returns filter fields and assignment overview rows |
| `components/admin/AdminSideNav.tsx` | Left nav. Used by `app/(admin)/layout.tsx` on every School Admin page |
| `components/admin/SetupProgressCard.tsx` | Setup Progress widget on the dashboard |
| `components/admin/BulkImportPanel.tsx` | CSV upload zone + preview table. Used on Teachers and Students |
| `components/admin/BrandingPreviewPanel.tsx` | Live student-view preview on Branding |
| `components/admin/AcademicSetupStepCard.tsx` | Year / Term / Class / Subject step card on Academic Setup |
| `components/admin/ParentChildLinkPanel.tsx` | Selected parent + linked children + link-child form (client). Used on Parents |
| `components/admin/PeopleSubNav.tsx` | Teachers / Students / Admins / Parents tab links. Used on all four People pages so none are orphans |
| `components/shared/DataTable.tsx` | Generic striped table. Used on Teachers, Students, Admins, Assignments |
| `components/shared/FilterRow.tsx` | Filter dropdown bar. Used on Assignments (Teachers/Students mockups have no filters) |
| `components/shared/UploadZone.tsx` | Dashed upload area. Used on Branding and inside `BulkImportPanel` |
| `components/shared/FormField.tsx` | Label + control slot. Used on Branding and Parent linking |

Color swatches on Branding are inlined in `app/(admin)/admin/branding/page.tsx` (single use; `ColorSwatch` shared file removed in the final verification audit).

#### Final School Admin route map

School Admin routes use a route group `(admin)` plus a real `admin` segment, so URLs always start with `/admin/`. This avoids collisions with Teacher (`/teacher/`) and Student (`/feed`).

| URL | Page |
|---|---|
| `/admin/dashboard` | School Admin Dashboard |
| `/admin/branding` | School Branding |
| `/admin/academic` | Academic Setup |
| `/admin/people/teachers` | Teachers |
| `/admin/people/students` | Students |
| `/admin/people/admins` | School Admins |
| `/admin/people/parents` | Parent-Child Linking |
| `/admin/assignments` | Assignments Overview |

`design/mockups/components-extraction-list.md` includes a School Admin component inventory (admin + shared tables) without an explicit "School Admin" heading. Extraction followed that inventory plus the session named component list and the eight `school-admin-*.html` mockups. `TabBar` and `EmptyState` were skipped because the mockups do not use them.

### Platform Admin P0 screens (2026-09-24)

| File | Purpose |
|---|---|
| `app/(platform)/layout.tsx` | Side nav shell. Renders `PlatformSideNav` on the left and `{children}` on the right |
| `app/(platform)/platform/dashboard/page.tsx` | Platform dashboard. Reads `getPlatformDashboard()` |
| `app/(platform)/platform/tenants/page.tsx` | Tenant list. Reads `getTenants()` |
| `app/(platform)/platform/tenants/new/page.tsx` | Create tenant form (client). Visual only |
| `app/(platform)/platform/tenants/[tenantId]/page.tsx` | Tenant detail / profile. Reads `getTenant(tenantId)` |
| `app/(platform)/platform/tenants/[tenantId]/subscription/page.tsx` | Subscription control. Reads `getTenantSubscription(tenantId)` |
| `app/(platform)/platform/audit/page.tsx` | Audit log. Reads `getAuditLog()` |
| `lib/stubs/get-platform-dashboard.ts` | `getPlatformDashboard()` returns `PlatformDashboard`: summary tiles, onboarding rows, recent audit items |
| `lib/stubs/get-tenants.ts` | `getTenants()` returns `TenantsList` with five tenants covering Trial / Active / Suspended / Cancelled |
| `lib/stubs/get-tenant.ts` | `getTenant(tenantId)` returns `TenantDetail` (id `"1"` → Pilot School #1) |
| `lib/stubs/get-tenant-subscription.ts` | `getTenantSubscription(tenantId)` returns `TenantSubscription`: status options, confirm copy, history |
| `lib/stubs/get-audit-log.ts` | `getAuditLog()` returns `AuditLog`: filters + events (one with expanded `detail`) |
| `components/platform/PlatformSideNav.tsx` | Left nav. Used by `app/(platform)/layout.tsx` on every Platform Admin page |
| `components/platform/TenantStatusPill.tsx` | Subscription status pill by fill pattern (outline / solid / stripe / strikethrough) |
| `components/platform/OnboardingProgressCell.tsx` | ✓ / ○ cell. Used on Platform Dashboard onboarding table |
| `components/platform/TenantSummaryTile.tsx` | Summary tile. Used five times on Platform Dashboard |
| `components/platform/SubscriptionRadioGroup.tsx` | Trial / Active / Suspended / Cancelled radios (client). Used on Subscription |
| `components/platform/AuditLogRow.tsx` | Expandable audit table row (client) |
| `components/platform/AuditLogDetail.tsx` | Expanded audit detail panel |
| `components/shared/ElevatedAccessBanner.tsx` | "Acting as: [Tenant] — actions are logged." Used on Tenant Detail and Subscription |
| `components/shared/TabBar.tsx` | Horizontal tab nav. Used on Tenant Detail and Subscription |

The subscription confirm panel markup is inlined in `app/(platform)/platform/tenants/[tenantId]/subscription/page.tsx` (single use; `ConfirmPanel` shared file removed in the final verification audit).

#### Final Platform Admin route map

Platform Admin routes use a route group `(platform)` plus a real `platform` segment, so URLs always start with `/platform/`. This avoids collisions with Teacher (`/teacher/`), School Admin (`/admin/`), and Student (`/feed`).

| URL | Page |
|---|---|
| `/platform/dashboard` | Platform Dashboard |
| `/platform/tenants` | Tenant List |
| `/platform/tenants/new` | Create Tenant |
| `/platform/tenants/1` | Tenant Detail (Pilot School #1) |
| `/platform/tenants/1/subscription` | Tenant Subscription |
| `/platform/audit` | Audit Log |

Filename mapping (exact `platform-*.html` names were mostly missing):

| Expected | Used |
|---|---|
| `platform-dashboard.html` | `platform-dashboard.html` (existed) |
| `platform-tenant-list.html` | `tenant-list.html` |
| `platform-create-tenant.html` | `create-tenant.html` |
| `platform-tenant-detail.html` | `tenant-detail-profile.html` |
| `platform-tenant-subscription.html` | `tenant-detail-subscription.html` |
| `platform-audit-log.html` | `audit-log.html` |

`design/mockups/components-extraction-list.md` had no Platform Admin section. Extraction followed the session named component list and the six mockups. `EmptyState` was skipped (mockup empty state is `hidden`; empty states are out of scope). Tenant list onboarding uses text labels (`3 / 4 complete`), not checkmarks — `OnboardingProgressCell` is used on the dashboard only.

Tenant names match the mockups (not the prompt's alternate set): Pilot School #1 (Trial), Monrovia Academy (Active), St. Paul's Learning Center (Active), Brewerville Community School (Suspended), Hope International School (Cancelled).

### Auth spike (2026-10-01)

| File | Purpose |
|---|---|
| `app/(auth)/layout.tsx` | Centered card. No persona nav |
| `app/(auth)/login/page.tsx` | Email and password sign-in |
| `app/(auth)/invite/[token]/page.tsx` | Accept an invite and set a password |
| `app/(auth)/reset/page.tsx` | Request a reset email |
| `app/(auth)/reset/confirm/page.tsx` | Set a new password from the email link |
| `app/api/health/route.ts` | Public `{ ok: true }` health check |
| `components/auth/*` | The four forms plus shared field, error, and submit |
| `lib/auth/public-paths.ts` | Login redirect allowlist |
| `lib/auth/claims.ts` | Reads `role` and `tenant_id` from an access token |
| `lib/supabase/middleware.ts` | Session refresh, login redirect, claim headers |
| `supabase/migrations/0001_custom_access_token_hook.sql` | Auth tables, the §10 hook, and the spike DDL helper |
| `scripts/enable-auth-hook.ts` | Prints the manual dashboard registration steps |
| `scripts/seed-dev.ts` | Pilot tenant and one user per persona |
| `scripts/load-env.ts` | Loads `.env.local` for the scripts and the e2e test |
| `tests/e2e/auth-jwt.spec.ts` | Proves the JWT claim reaches RLS. This is the spike |
| `app/(student)/feed/page.tsx` | Dev-only banner for `x-app-role` and `x-tenant-id` |

### Route map — all personas

| Route prefix | Persona | Layout |
|---|---|---|
| `/feed`, `/lessons/*`, `/assignments/*` | Student | `app/(student)/layout.tsx` |
| `/teacher/*` | Teacher | `app/teacher/layout.tsx` |
| `/admin/*` | School Admin | `app/(admin)/layout.tsx` |
| `/platform/*` | Platform Admin | `app/(platform)/layout.tsx` |
| `/login`, `/invite/*`, `/reset`, `/reset/confirm` | All | `app/(auth)/layout.tsx` |
| `/api/health` | Public | No persona layout |

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

Teacher page, after the same middleware step:

1. The browser requests a Teacher URL such as `http://pilotschool.localhost:3000/teacher/home`.
2. `middleware.ts` reads `Host`, resolves `pilotschool`, and sets `x-tenant-subdomain`.
3. Role check is a stub for now. There is no auth gate; the `teacher` layout always renders.
4. `app/teacher/layout.tsx` wraps the page with `TeacherSideNav`.
5. The page calls its stub (`getTeacherHome`, `getLessonForEdit`, `getAssignmentForEdit`, `getSubmissionsForAssessment`, `getGradeEntryRoster`, or `getLessonForReuse`).
6. The stub returns hardcoded mockup copy. It does not read Supabase or filter by tenant.
7. The page renders Teacher and shared components. Client forms hold input state only; buttons do not save.

School Admin page, after the same middleware step:

1. The browser requests a School Admin URL such as `http://pilotschool.localhost:3000/admin/dashboard`.
2. `middleware.ts` reads `Host`, resolves `pilotschool`, and sets `x-tenant-subdomain`.
3. Role check is a stub for now. There is no auth gate; the `(admin)` layout always renders.
4. `app/(admin)/layout.tsx` wraps the page with `AdminSideNav`.
5. The page calls its stub (`getAdminDashboard`, `getSchoolBranding`, `getAcademicStructure`, `getTeachers`, `getStudents`, `getSchoolAdmins`, `getParents`, or `getAdminAssignments`).
6. The stub returns hardcoded mockup copy. It does not read Supabase or filter by tenant.
7. The page renders admin and shared components. Client panels hold input state only; buttons do not save.

Platform Admin page, after the same middleware step:

1. The browser requests a Platform Admin URL such as `http://pilotschool.localhost:3000/platform/dashboard`.
2. `middleware.ts` reads `Host`, resolves `pilotschool`, and sets `x-tenant-subdomain`.
3. Role check is a stub for now. There is no auth gate; the `(platform)` layout always renders.
4. `app/(platform)/layout.tsx` wraps the page with `PlatformSideNav`.
5. The page calls its stub (`getPlatformDashboard`, `getTenants`, `getTenant`, `getTenantSubscription`, or `getAuditLog`).
6. The stub returns hardcoded mockup copy. It does not read Supabase or filter by tenant.
7. The page renders platform and shared components. Client forms and expanders hold UI state only; buttons do not save or write audit events.

## Auth flow

Browser → `middleware.ts` → session refresh → `x-app-role` and `x-tenant-id` → page.

1. The browser requests any page except the public allowlist: `/login`, `/invite/*`, `/reset/*`, `/_next/*`, `/api/health`.
2. Root `middleware.ts` still resolves the hostname to `x-tenant-subdomain`. Next.js does not run `app/middleware.ts`.
3. `lib/supabase/middleware.ts` calls `supabase.auth.getUser()`, which refreshes the session cookie when the access token is due.
4. If there is no user, the response is a redirect to `/login`. `/login` is on the allowlist, so this is not a loop.
5. If there is a user, the middleware reads `app_role` and `tenant_id` from the access-token payload (the hook writes those claims; they are not on the user object) and sets request headers `x-app-role` and `x-tenant-id`. Incoming copies of those headers are deleted first so a browser cannot spoof them. The reserved JWT `role` claim stays `authenticated` and is not copied onto a header.
6. There is no role-based route gate yet. A signed-in student can still open `/admin` or `/platform`.
7. In development, `app/(student)/feed/page.tsx` prints those headers in a banner. Production builds omit the banner. Remove the banner before the pilot.
8. After a successful password sign-in, the login form navigates to `/feed`. That is a temporary landing, not role routing.

Sign-in, invite, and reset call Supabase Auth from the browser. They are not stubs.

- `/login` uses `signInWithPassword`. A bad password surfaces the Auth error (`Invalid login credentials` when Auth is reachable).
- `/invite/[token]` treats the path segment as an invite `token_hash`, calls `verifyOtp({ type: 'invite' })`, then `updateUser({ password })`.
- `/reset` calls `resetPasswordForEmail` with `redirectTo` set to `/reset/confirm`.
- `/reset/confirm` exchanges a `code` or a recovery `token_hash`, then sets the new password. A link with neither shows "This reset link is invalid or has expired."

## JWT claim hook

`public.custom_access_token_hook` runs when Supabase Auth issues an access token. The function body is the one in `docs/data-model.md` §10, copied into `supabase/migrations/0001_custom_access_token_hook.sql`. It reads `platform_admins` first. A platform admin gets `app_role: platform_admin` and no `tenant_id`. Everyone else gets `tenant_id` and `app_role` from `profiles.role`. The JWT `role` claim is left as `authenticated`.

The same migration creates `tenants`, `platform_admins`, and `profiles`, because the hook selects from those tables. It does not create the academic tables. RLS is enabled on the three auth tables. `supabase_auth_admin` has a SELECT policy on `profiles` and `platform_admins`, because the hook is `SECURITY INVOKER` and runs as that role. Without that policy the hook would see zero rows and the token would have no `tenant_id`.

Registration is manual. `scripts/enable-auth-hook.ts` only prints the steps. It does not call the Management API.

1. Run the migration SQL in the Supabase SQL editor.
2. Dashboard → Authentication → Hooks.
3. Custom Access Token → `public.custom_access_token_hook` → Save.
4. Sign in again. Old tokens do not grow the new claims.

How to test: `tests/e2e/auth-jwt.spec.ts` creates a student, signs in through `/login`, decodes the access token, builds a throwaway table whose policy is `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid`, and asserts the user can read only their own row. DDL for that table goes through `public.auth_spike_exec`, which is granted only to `service_role`. Drop that function before the pilot.

## How to seed the dev environment

Apply `supabase/migrations/0001_custom_access_token_hook.sql` first. Then:

```bash
npm run seed:dev
```

The script creates tenant "Pilot School #1" (`subdomain` `pilotschool`), one `platform_admins` user, and one `profiles` row each for school admin, teacher, student, and parent. The platform admin is not inserted into `profiles`. Passwords are printed in the terminal. Re-running the script resets those passwords and reuses the existing tenant.

## What the auth spike proved

The spike did not pass. Stop here. Do not build role gates or replace stubs until this test is green.

`npx playwright test tests/e2e/auth-jwt.spec.ts` fails in `auth.admin.listUsers` with `AuthRetryableFetchError: fetch failed`. No access token is issued, so nothing was decoded.

What the JWT actually contains: nothing. The login form shows `Failed to fetch`. The browser request to `https://<project-ref>.supabase.co/auth/v1/health` returns `ERR_NAME_NOT_RESOLVED`. `https://supabase.com` loads, so this machine can reach Supabase's website and cannot resolve the project host in `.env.local`.

What the RLS policy actually reads: the policy was never created. The test would have installed `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid` on `public.auth_spike_rows`. That SQL did not run.

The exact SQL query that failed: none. The call that failed is the Auth Admin HTTP request, before any SQL. `npm run seed:dev` fails on the same unreachable host.

Hypothesis: `NEXT_PUBLIC_SUPABASE_URL` does not name a project DNS is publishing. Auth never mints a JWT, so the hook never runs and RLS never evaluates `auth.jwt()`. This is not evidence that the hook SQL is wrong, and it is not a reason to bypass RLS. Copy the project URL from the dashboard Connect dialog, apply the migration, register the hook, then run the same test again. The application role claim is `app_role`.

The dashboard sign-in page was shown for this project. The hook was not registered, because that click requires a signed-in dashboard session and a database the host can reach.

## If this breaks, look here

| Symptom | Look here |
|---|---|
| Login fails | Supabase dashboard → Authentication → Users, and the email confirmation setting. Dev should have "Confirm email" off. The login page shows the Auth error text |
| JWT has no `tenant_id` claim | The hook is not registered. Dashboard → Authentication → Hooks → Custom Access Token → `public.custom_access_token_hook`. Sign in again after saving |
| Queries fail with 'role X does not exist' | JWT claim collision with Supabase's reserved `role` claim. The app role must be `app_role`. The `profiles.role` column stays `role` |
| RLS blocks everything including own-tenant rows | The hook is reading the wrong column. `0001_custom_access_token_hook.sql` must select `profiles.tenant_id` and `profiles.role` |
| Redirect loop on `/login` | `lib/auth/public-paths.ts`. `/login`, `/invite/*`, `/reset/*`, `/_next/*`, and `/api/health` must stay public |
| `Failed to fetch` on sign-in, or `npm run seed:dev` says the URL did not resolve | `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`. The project host must resolve. `https://supabase.com` loading does not mean the project host exists |
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
| Pending Grading list empty | `lib/stubs/get-teacher-home.ts` |
| Grade Entry table missing students | `lib/stubs/get-grade-entry-roster.ts` |
| Submission view shows wrong student | `components/teacher/SubmissionDetail.tsx` |
| Form inputs don't hold state | confirm component has `"use client"` |
| Teacher/Student table missing rows | `lib/stubs/get-teachers.ts` or `lib/stubs/get-students.ts` |
| Branding preview blank | `components/admin/BrandingPreviewPanel.tsx` |
| CSV import preview empty | `components/admin/BulkImportPanel.tsx` |
| Status pills look identical | `components/platform/TenantStatusPill.tsx` (fill pattern props) |
| Elevated banner missing | `components/shared/ElevatedAccessBanner.tsx` is not being rendered by the page |
| Audit detail won't expand | `components/platform/AuditLogRow.tsx` needs `"use client"` |
| Tenant list filters broken | `components/shared/FilterRow.tsx` |
| People pages (Students / Admins / Parents) feel unreachable | `components/admin/PeopleSubNav.tsx` must render on each People page. Side nav "People" alone only opens Teachers |
| Submission Status page has no in-app path | Assignment detail must link to `/assignments/[id]/status` in `app/(student)/assignments/[assignmentId]/page.tsx` |
| Lesson Reuse page has no in-app path | Create Lesson header must link to `/teacher/lessons/1/reuse` in `app/teacher/lessons/new/page.tsx` |
| Student Home tab does not return to the feed | `components/student/BottomNav.tsx` Home must be a `Link` to `/feed` (client; uses `usePathname`) |
| Duplicate StatusBadge import errors after merge | Import `@/components/shared/StatusBadge` only. Pass `tone` for Student chips; omit `tone` (use `className`) for Teacher/Admin |
| Brand fallback colors look off-palette | `app/globals.css` `--brand-*` vars must stay on `#333333` / `#666666` / `#E5E5E5` |

## Shared components inventory

| Component | Path | Personas using it | Platform Admin reuse candidate |
|---|---|---|---|
| `PageHeader` | `components/shared/PageHeader.tsx` | Student | No (phone greeting / section mark) |
| `PrimaryButton` | `components/shared/PrimaryButton.tsx` | Student (Teacher / Platform keep mockup button classes inline) | Yes |
| `StatusBadge` | `components/shared/StatusBadge.tsx` | Student, Teacher, School Admin (optional `tone` for Student) | Yes (subscription pills use `TenantStatusPill` instead) |
| `DataTable` | `components/shared/DataTable.tsx` | School Admin, Platform Admin | In use |
| `FilterRow` | `components/shared/FilterRow.tsx` | School Admin, Platform Admin | In use (optional className / textFields) |
| `UploadZone` | `components/shared/UploadZone.tsx` | School Admin | Yes |
| `FormField` | `components/shared/FormField.tsx` | School Admin, Platform Admin | In use (Create Tenant) |
| `ElevatedAccessBanner` | `components/shared/ElevatedAccessBanner.tsx` | Platform Admin | — |
| `TabBar` | `components/shared/TabBar.tsx` | Platform Admin | — |

Removed in the final verification audit (one call site each, inlined): `ColorSwatch`, `ConfirmPanel`. Student `StatusBadge` merged into shared.

## Current state — all personas

Counts after the 2026-09-24 final verification audit (page routes only; layouts excluded). Parent persona portal is not built.

| Persona | Page routes | Notes |
|---|---|---|
| Student | 4 | `/feed`, `/lessons/[lessonId]`, `/assignments/[assignmentId]`, `/assignments/[assignmentId]/status` |
| Teacher | 6 | Under `/teacher/*` |
| School Admin | 8 | Under `/admin/*` |
| Platform Admin | 6 | Under `/platform/*` |
| Root scaffold | 1 | `/` foundation placeholder |
| **Total page routes** | **25** | |

| Inventory | Count |
|---|---|
| Shared components (`components/shared/*.tsx`) | 9 |
| Persona-specific components (`components/{student,teacher,admin,platform}/*.tsx`) | 26 |
| **Total components** | **35** |
| Stub modules (`lib/stubs/*.ts`) | 23 |

**Known issues / tech debt (flagged, not changed unless noted):**

- Parent persona screens are absent (only `app/(tenant)/(parent)/.gitkeep`).
- Auth pages and session middleware are wired. Persona screens still read stubs. The JWT `tenant_id` claim is not proven. See "What the auth spike proved".
- Student BottomNav Classes / Grades are non-links (no built routes). Teacher Classes, Admin Usage, Platform Subscriptions / Usage are `#` placeholders.
- Stub structural duplication: `AssignmentMaterial` defined in two stubs; teachers/students list+CSV shapes are near-clones; tenant profile/subscription `tabs` arrays are copied; lesson content repeated across three lesson stubs; audit snippets overlap dashboard and audit-log.
- Stub content flag for human review: `get-lesson-for-edit` uses `https://www.example.com/...` as `videoUrl` (placeholder domain). Stub sample strings were not rewritten.
- Brand CSS variables in `app/globals.css` were aligned to the allowed gray palette in this audit; they are still unused by persona screens (mockups use hex classes).

## Two grading paths

The Teacher IA has two grading workflows. Both write to the same `grades` table (`docs/data-model.md`). `grades.submission_id` is nullable: assignment grades link a submission; quiz/test/exam grades stand alone.

**Submission-based (assignments).** The student submitted digital work. The teacher opens the assessment, picks a student from the list, reads the work, and enters a score plus feedback. Components: `SubmissionList` (left column) and `SubmissionDetail` (right column). Route: `/teacher/assignments/[assignmentId]/submissions`. Stub: `getSubmissionsForAssessment`.

**Score-only (quizzes / tests / exams).** There is no digital submission. The teacher opens a roster table and enters scores inline for the whole class. Component: `GradeEntryTable`. Route: `/teacher/assessments/[assessmentId]/grade-entry`. Stub: `getGradeEntryRoster`.

Both paths use the same `Assessment` type from `lib/stubs/get-assignment-for-edit.ts` (`type: "assignment" | "quiz" | "test" | "exam"`). Do not merge the two UIs into one component. Pending Grading on Teacher Home links to both: "Grade" for assignments, "Enter Scores" for quizzes.

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

## Verification on 2026-09-24 — Teacher screens

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run lint` | Passed. Deprecation warning for `next lint`. No ESLint errors |
| `npm run build` | Passed. Teacher routes listed: `/teacher/home`, `/teacher/lessons/new`, `/teacher/assignments/new`, `/teacher/assignments/[assignmentId]/submissions`, `/teacher/assessments/[assessmentId]/grade-entry`, `/teacher/lessons/[lessonId]/reuse` |
| `/teacher/home` | Mockup copy present (Mrs. Johnson greeting, classes, pending grading, upcoming) |
| `/teacher/lessons/new` | Mockup copy present |
| `/teacher/assignments/new` | Mockup copy present |
| `/teacher/assignments/1/submissions` | Mockup copy present |
| `/teacher/assessments/1/grade-entry` | Mockup copy present |
| `/teacher/lessons/1/reuse` | Mockup copy present |
| `/home` | Does not serve Teacher Home (old unprefixed path removed) |

Verified with `Invoke-WebRequest` to `127.0.0.1:3000` and `Host: pilotschool.localhost:3000` (Windows could not resolve `pilotschool.localhost` via DNS). No in-editor browser tool was available.

## Verification on 2026-09-24 — School Admin screens

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run lint` | Passed. Deprecation warning for `next lint`. No ESLint errors |
| `npm run build` | Passed. Admin routes listed: `/admin/dashboard`, `/admin/branding`, `/admin/academic`, `/admin/people/teachers`, `/admin/people/students`, `/admin/people/admins`, `/admin/people/parents`, `/admin/assignments` |
| `/admin/dashboard` | 200 — needle `Setup Progress` |
| `/admin/branding` | 200 — needle `School Branding` |
| `/admin/academic` | 200 — needle `Academic Setup` |
| `/admin/people/teachers` | 200 — needle `Mrs. Abena Kollie` |
| `/admin/people/students` | 200 — needle `Amara Johnson` |
| `/admin/people/admins` | 200 — needle `Edith Johnson` |
| `/admin/people/parents` | 200 — needle `Mrs. Agnes Johnson` |
| `/admin/assignments` | 200 — needle `Reading Response` |
| `/feed` | 200 — needle `Mathematics` (no regression) |
| `/teacher/home` | 200 — needle `Mrs. Johnson` (no regression) |

Verified with `Invoke-WebRequest` to `127.0.0.1:3000` and `Host: pilotschool.localhost:3000`. Visual/browser verification was not done.

## Verification on 2026-09-24 — Platform Admin screens

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run lint` | Passed. Deprecation warning for `next lint`. No ESLint errors |
| `npm run build` | Passed. Platform routes listed: `/platform/dashboard`, `/platform/tenants`, `/platform/tenants/new`, `/platform/tenants/[tenantId]`, `/platform/tenants/[tenantId]/subscription`, `/platform/audit` |
| `/platform/dashboard` | 200 — needle `Total Tenants` |
| `/platform/tenants` | 200 — needle `Pilot School #1`; all four status labels present with distinct fill patterns |
| `/platform/tenants/new` | 200 — needle `Mrs. Abena Kollie` |
| `/platform/tenants/1` | 200 — needles `Acting as:` and `Pilot School #1` |
| `/platform/tenants/1/subscription` | 200 — needles `Acting as:` and `Pilot School #1` |
| `/platform/audit` | 200 — needle `Audit Log` |
| `/feed` | 200 — needle `Mathematics` (no regression) |
| `/teacher/home` | 200 — needle `Mrs. Johnson` (no regression) |
| `/admin/dashboard` | 200 — needle `Setup Progress` (no regression) |

Verified with `Invoke-WebRequest` to `127.0.0.1:3002` (port 3000 was already occupied) and `Host: pilotschool.localhost:3002`. Visual/browser verification was not done.

## Verification on 2026-09-24 — Final verification audit

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run lint` | Passed. Deprecation warning for `next lint`. No ESLint errors |
| `npm run build` | Passed. All 25 page routes present after orphan-link and component cleanup |
| `/feed` | 200 — needle `Mathematics` |
| `/teacher/home` | 200 — needle `Mrs. Johnson` |
| `/admin/dashboard` | 200 — needle `Setup Progress` |
| `/platform/dashboard` | 200 — needle `Total Tenants` |
| Orphan fixes | Assignment links to status; Create Lesson links to reuse; PeopleSubNav reaches Students/Admins/Parents |

Verified with `Invoke-WebRequest` to `127.0.0.1:3010` (ports 3000/3002 were busy or stale) and `Host: pilotschool.localhost:3010`. Visual/browser verification was not done.

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

### 2026-09-24 — Teacher screens. Followed the prompt

- Six Teacher mockups converted to App Router pages under `app/teacher/` with a shared `TeacherSideNav` layout.
- Teacher URLs use a `/teacher` path prefix (e.g. `/teacher/home`). Student home remains `/feed`.
- Two grading paths kept separate: submission UI vs `GradeEntryTable`, shared `Assessment` type, same future `grades` table.
- `components-extraction-list.md` had no Teacher section; expected component list from the session brief was used.
- Client forms hold input state only. Buttons do not save. No Supabase, auth, uploads, or empty/loading states.
- Route checks used `127.0.0.1` plus `Host: pilotschool.localhost:3000` because this Windows host did not resolve `*.localhost`.

### 2026-09-24 — School Admin screens. Followed the prompt

- Eight School Admin mockups converted under `app/(admin)/admin/` with `AdminSideNav` layout.
- URLs always start with `/admin/` (route group + real segment). Teacher and Student routes unchanged.
- Shared table/filter/upload/form pieces live in `components/shared/` for later Platform Admin reuse.
- `TabBar` and `EmptyState` skipped — not present in the mockups. FilterRow used on Assignments only (Teachers/Students HTML has no filter bar).
- Client only where needed (`AdminSideNav`, `ParentChildLinkPanel`). Forms are visual; buttons do not save.
- No Supabase, auth, real uploads, CSV parsing, or empty/loading states.

### 2026-09-24 — Platform Admin screens. Followed the prompt

- Six Platform Admin mockups converted under `app/(platform)/platform/` with `PlatformSideNav` layout.
- URLs always start with `/platform/` (route group + real segment). Teacher, School Admin, and Student routes unchanged.
- Exact `platform-*.html` filenames were mostly missing; used the known 1:1 equivalents listed in the Platform Admin file map.
- `components-extraction-list.md` had no Platform Admin section; session expected component list + mockups drove extraction.
- Subscription pills use fill pattern only (`TenantStatusPill`), not color. Suspended uses a repeating stripe gradient.
- `TabBar` and `ElevatedAccessBanner` added to `components/shared/`. `EmptyState` skipped. `ConfirmPanel` was later inlined into the subscription page (single use).
- Client only where needed (`PlatformSideNav`, Create Tenant form, `SubscriptionRadioGroup`, `AuditLogRow`). Forms and confirms are visual; no audit writes.
- No Supabase, auth, elevated-path enforcement, or empty/loading states.

### 2026-09-24 — Final verification audit. Followed the prompt

- Audited routes, shared components, styles, stubs, navigation, and Student mobile. Parent portal absent.
- Fixed orphans: assignment → status Link; Create Lesson → reuse Link; PeopleSubNav on all four People pages.
- Merged student `StatusBadge` into shared (optional `tone`). Inlined one-use `ColorSwatch` and `ConfirmPanel`, then deleted those shared files.
- Aligned unused brand CSS vars to the allowed gray palette. Softened Student MaterialRow / flex rows for 390px overflow.
- Did not rewrite stub sample content. No auth/database work.

### 2026-10-01 — Auth spike. Followed the prompt

- Login, invite, reset, and reset confirm call Supabase Auth. No role-based route protection. No academic migrations. Stubs were not replaced.
- Middleware stays at the repository root. `app/middleware.ts` would not run.
- The hook function body matches `docs/data-model.md` §10. Grants for `supabase_auth_admin`, the three auth tables, and `auth_spike_exec` are in the same migration because the function cannot run without them.
- Post-login navigation goes to `/feed` so the dev banner is the next screen. That is not role routing.
- The RLS test did not pass. The project host in `.env.local` does not resolve, so no JWT was issued. See "What the auth spike proved". The hook was not registered.
