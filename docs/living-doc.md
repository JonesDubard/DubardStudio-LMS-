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
