## 12. Open Questions & Decisions

This is a repo-local mirror of Section 12 of the living doc. Update this file whenever a decision is made or an open item is closed. The Google Doc version is updated at milestones only. If they disagree, this file wins for technical decisions.

### Resolved (locked)

| Item | Resolution | Date | Source |
|---|---|---|---|
| Roles source of truth | memberships table is authoritative (role lives there, not profiles.role) | Oct 2026 | Gativa ERD v3 |
| tenant_id JWT claim | custom_access_token_hook injects tenant_id + app_role; RLS reads auth.jwt() | Oct 2026 | Spike passing |
| Reserved role claim | Application role uses the app_role claim; Supabase's role claim is never touched | Oct 2026 | Spike fix |
| Paper-based quizzes | Modeled as assessments.type = assignment / quiz / test / exam; grades.submission_id is NULLABLE | Oct 2026 | data-model.md v2 |
| Files storage pattern | Central files table; lesson_materials references file_id | Oct 2026 | ERD v3 + migration 0005a |
| Logo storage | Deliberate exception — logos stay as tenants.logo_path and do NOT reference the files table | Oct 2026 | Gativa confirmation |
| Platform admins | Separate platform_admins table (not stored in profiles) | Oct 2026 | data-model.md v2 |
| Tenant file bucket | Private bucket named tenant-files; path pattern {tenant_id}/...; storage policy mirrors RLS | Oct 2026 | migration 0005a |
| Multiple school admins per tenant | Supported via memberships (one role per user per tenant, per row) | Oct 2026 | NF-20 + ERD v3 |
| Transactional tenant provisioning | FR-2.2.2 handled by a single provision_tenant() function, not a provisioning_steps table | Oct 2026 | Gativa ERD v3 |
| Partner agreement | Letter of Intent sent to Gativa: no payment Phase 1; percentage negotiated post-pilot; reciprocal market support for Partners' Product | Oct 2026 | LOI draft |
| Assessment materials | assessment_materials table in scope for MVP so standalone quizzes can attach their own files | Oct 2026 | Gativa ERD v3 |
| Migration numbering | Assigned by application order, not feature grouping. 0005a = files. 0005b reserved for memberships/enrollments/people | Oct 2026 | teaching.md |

### Still open (needs decision)

| Item | Question | Owner | Target |
|---|---|---|---|
| Grade format | Numeric 0-100, letter grade, percentage, or per-school choice? Affects US-059, US-085, US-087 | Product + Gativa | Before migration 0006 (assessments/grades) |
| Last admin removal | Can the last remaining School Admin remove themselves and lock the school out? | Product | Before invitations UI ships (0005b) |
| Roster sync | Should the pilot school's SMS do a read-only student list sync, or is CSV import sufficient? | Product + Pilot admin | Before pilot launch |
| Offline cache size | Last 5 lessons or last 7 days? | Product | Before PWA work (Release 2) |
| Custom domains timing | Move into MVP if 2-3 pipeline schools require it as a signing condition? | Product + GTM | Before first expansion wave |
| Parent channel | Email or SMS for the weekly digest? | Product + Pilot admin | Before digest build (Release 2) |
| Telemetry sampling | How often to sample page-speed data and where to store it? | Frontend | Before NF-14 work (Release 2) |
| Replacing submissions | Once a submission is graded, can the student still replace it before the due date? | Product | Before US-083 (Release 2) |
| Tech Review-only items | Keep Lessons overview, Assignments overview, Student submissions view in Release 2 given they are not in the PRD? | Product | Before Release 2 planning |
| Removed screens | Who builds accept-invite, login, expired-link, and 'access paused' screens — Supabase defaults or custom? | Product + Gativa | Before 0005b (invitations) |
| US-083 to US-087 release | Confirm these StoriesOnBoard additions belong in Release 2 | Product | Before Release 2 planning |
| Custom roles | Are the 5 roles fixed, or can a school create its own (e.g. Head of Department)? | Product | Before 0005b (memberships) |
| One person, two roles | Confirmed solved by memberships? Multiple roles per user per tenant needs an explicit yes/no | Product + Gativa | Before 0005b (memberships) |
| SMS provider | Termii vs Twilio — needs live delivery test on Orange/MTN Liberia | Backend (Gativa) | Before NF-19 work (Release 2) |
| Background job queue design | Edge Functions vs pgmq — needs spike | Backend (Gativa) | Before bulk invite (0005b / US-031) |
| Subscription status transitions | Can a school go cancelled → active? Rules for suspension → reactivation | Product + Gativa | Before Platform Admin subscription UI ships |
| Migration plan from Gativa | Awaiting their migration plan + timeline doc | Gativa | This week |

## 6. Post-MVP Roadmap (Release 2 / P1)

*Note: These features are not required for the initial pilot launch but are prioritized for Release 2 to increase daily active usage, parent engagement, and school stickiness.*

### 6.1 The Notice Board (Announcements)
**Owner:** Full Stack
**Problem Solved:** Replaces chaotic WhatsApp groups for official communication.
**Requirements:**
- School Admins and Teachers can post text announcements.
- Can be targeted to the whole school, specific classes, or specific roles (e.g., only Parents).
- Appears prominently on the Student, Parent, and Teacher dashboards.
- *Backend Need:* New `announcements` table with RLS policies.

### 6.2 True Offline Mode (PWA Enhancement)
**Owner:** Frontend / Backend
**Problem Solved:** Allows students to study without an active internet connection.
**Requirements:**
- Students can click "Save Offline" on a lesson.
- The lesson text, compressed images, and one PDF are cached to the phone (using IndexedDB/Dexie).
- A clear "Offline Mode" indicator appears when the connection is lost.
- *Backend Need:* Ensure CORS is enabled on the `tenant-files` storage bucket so the browser can cache the PDFs.

### 6.3 Quick Grading Tools (Teacher Workload Reduction)
**Owner:** Full Stack
**Problem Solved:** Speeds up the time teachers spend on administrative tasks.
**Requirements:**
- "Mark All as Submitted" button for paper-based assignments.
- Ability to duplicate a full assessment (instructions and attachments) from one class to another.
- *Backend Need:* New Server Actions for bulk status updates.

### 6.4 The Digital Library (School Resources)
**Owner:** Full Stack
**Problem Solved:** Provides a central repository for past exam papers (e.g., WAEC), study guides, and school policies.
**Requirements:**
- A separate section distinct from daily lessons.
- Files organized by Grade Level, Subject, or general categories.
- Accessible to Students and Parents.
- *Backend Need:* New `library_resources` table linking to the `files` table.

### 6.5 School Admin Usage Dashboard
**Owner:** Backend
**Source:** Original PRD §4.2
**Problem Solved:** Allows principals to see if teachers are actually using the system.
**Requirements:**
- Simple overview of logins, lessons published, and submission rates.
- *Backend Need:* Aggregation queries grouped by tenant.

### 6.6 Platform Admin Usage Dashboard
**Owner:** Backend
**Source:** Original PRD §4.1
**Problem Solved:** Allows DubardStudio to monitor platform health.
**Requirements:**
- Overview of total tenants, active users, and storage consumed across all schools.
- *Backend Need:* Platform-level aggregation queries.

### 6.7 Teacher Reusable Content Library
**Owner:** Full Stack
**Source:** Original PRD §4.3
**Problem Solved:** Teachers prepare once and teach many times.
**Requirements:**
- Mark a lesson as "Reusable" in a personal library.
- Add that lesson to any class the teacher is assigned to.
- *Backend Need:* Add `is_reusable` boolean to the `lessons` table.

### 6.8 Automated Email Digest for Parents
**Owner:** Backend
**Source:** Original PRD §4.5 (SMS removed, Email only)
**Problem Solved:** Keeps parents informed even if they don't log in.
**Requirements:**
- Weekly automated email summarizing upcoming/overdue assignments and recent grades.
- *Backend Need:* Background cron job (using Resend or similar) to aggregate data and send emails.