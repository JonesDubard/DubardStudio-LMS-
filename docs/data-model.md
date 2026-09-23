# Data Model — Dubardstudio LMS

Status: DRAFT v2 — schema questions resolved
Last updated: [23/09/2026]
Owner: [you] — future backend partner reviews
Related: /docs/ia.md, /docs/flows.md, PRD §2.1 §2.4 §6.4

Changelog from v1:
- §7 Q1 resolved: JWT claim via custom_access_token_hook (§10)
- §7 Q2 resolved: separate platform_admins table
- §7 Q3 resolved: gradebook_categories in MVP
- §7 Q4 resolved: bulk CSV only, no SMS roster sync
- §7 Q5 resolved: manual custom domain
- §7 Q6 resolved: assessments can exist without a lesson
- §7 Q7 resolved: school_calendar deferred
- §7 Q8 resolved: PDF/doc/image only

---

## 1. Tenancy rules (non-negotiable)

- Every tenant-scoped table has `tenant_id uuid NOT NULL` referencing `tenants.id`
- Every tenant-scoped table has an RLS policy keyed on `tenant_id`
- RLS reads `tenant_id` from the Supabase JWT custom claim (see §10)
- Platform-level tables (`tenants`, `audit_log`, `platform_admins`) are
  exempt from per-tenant RLS
- Cross-tenant access only via audited Platform Admin path
- Storage paths: `/{tenant_id}/{resource_type}/{resource_id}/{file}`

---

## 2. Entity inventory

**Platform-level (no RLS):**
- tenants
- platform_admins
- audit_log

**Shared (self-scoped RLS):**
- profiles

**Tenant-scoped (RLS by tenant_id):**
- academic_years
- terms
- classes
- subjects
- class_subjects
- courses
- lessons
- lesson_materials
- gradebook_categories
- assessments
- submissions
- grades
- enrollments
- parent_children
- teacher_assignments

---

## 3. Entity relationships

- Tenant 1:N Profiles
- Tenant 1:N AcademicYears 1:N Terms
- Term 1:N Classes
- Class N:M Subjects (via class_subjects)
- ClassSubject 1:N Courses
- Course 1:N Lessons
- Lesson 1:N LessonMaterials
- Lesson 1:N Assessments (optional link — see §5)
- Course 1:N GradebookCategories
- GradebookCategory 1:N Assessments
- Assessment (type=assignment) 1:N Submissions
- Assessment 1:N Grades
- Grade.submission_id NULLABLE (null for score-only assessments)
- Student N:M Classes (via enrollments)
- Parent N:M Students (via parent_children)
- Teacher N:M ClassSubjects (via teacher_assignments)

---

## 4. Enums

| Enum | Values | Default | Notes |
|---|---|---|---|
| user_role | school_admin, teacher, student, parent | none | Platform admin role lives in platform_admins |
| subscription_status | trial, active, suspended, cancelled | trial | Gates auth per FR-2.2.4 |
| assessment_type | assignment, quiz, test, exam | assignment | Quiz/test/exam = score-only |
| grade_capture_mode | lms, sms, both | lms | Per-tenant setting |
| lesson_status | draft, published, archived | draft | |

---

## 5. Table definitions

### tenants (platform-level)

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| name | text | no | — | |
| subdomain | text | no | — | UNIQUE |
| custom_domain | text | yes | null | FR-2.3.4: present from day one, provisioning is manual |
| subscription_status | subscription_status | no | 'trial' | |
| grade_capture_mode | grade_capture_mode | no | 'lms' | |
| primary_color | text | yes | null | Hex |
| secondary_color | text | yes | null | Hex |
| logo_url | text | yes | null | Supabase Storage path |
| favicon_url | text | yes | null | |
| created_at | timestamptz | no | now() | |
| updated_at | timestamptz | no | now() | |

### platform_admins (platform-level, separate from profiles)

**Q2 resolved.** Kept separate to maintain a hard security boundary —
avoids dangerous RLS bypasses in the tenant-scoped profiles table.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | — | PK, FK to auth.users.id |
| full_name | text | no | — | |
| created_at | timestamptz | no | now() | |

**Access:** Platform admins authenticate via Supabase Auth, but their
`profiles` row does not exist. The custom_access_token_hook (§10) checks
this table and emits a `role: 'platform_admin'` claim with no `tenant_id`.

### profiles (shared, self-scoped RLS)

One row per tenant user (school_admin, teacher, student, parent). Does NOT
include platform admins.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | — | PK, FK to auth.users.id |
| tenant_id | uuid | no | — | NOT NULL — platform admins excluded |
| role | user_role | no | — | |
| full_name | text | no | — | |
| email | text | no | — | Denormalized from auth.users |
| phone | text | yes | null | For SMS digest (parent) |
| created_at | timestamptz | no | now() | |

**RLS:** A user can read their own profile. School Admins can read profiles
within their tenant. Platform Admins access via elevated path only.

**Multiple school admins:** supported. No uniqueness on (tenant_id, role).

### audit_log (platform-level, append-only)

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| actor_id | uuid | no | — | FK to auth.users.id |
| actor_kind | text | no | — | 'platform_admin' or 'tenant_user' |
| tenant_id | uuid | yes | null | Null for platform-level actions |
| action | text | no | — | e.g. 'tenant.suspend', 'cross_tenant.read' |
| resource_type | text | yes | null | |
| resource_id | uuid | yes | null | |
| result | text | no | — | 'success' / 'denied' |
| created_at | timestamptz | no | now() | |

**Policy:** INSERT-only via service role. No UPDATE. No DELETE.

### academic_years (tenant-scoped)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| tenant_id | uuid | no | — |
| name | text | no | — |
| start_date | date | no | — |
| end_date | date | no | — |
| is_current | boolean | no | false |
| created_at | timestamptz | no | now() |

### terms (tenant-scoped)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| tenant_id | uuid | no | — |
| academic_year_id | uuid | no | — |
| name | text | no | — |
| start_date | date | no | — |
| end_date | date | no | — |
| is_current | boolean | no | false |
| created_at | timestamptz | no | now() |

### classes (tenant-scoped)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| tenant_id | uuid | no | — |
| name | text | no | — |
| grade_level | text | yes | null |
| created_at | timestamptz | no | now() |

### subjects (tenant-scoped)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| tenant_id | uuid | no | — |
| name | text | no | — |
| created_at | timestamptz | no | now() |

### class_subjects (tenant-scoped)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| tenant_id | uuid | no | — |
| class_id | uuid | no | — |
| subject_id | uuid | no | — |

UNIQUE (class_id, subject_id).

### courses (tenant-scoped)

A subject offering within a class for a term.

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| tenant_id | uuid | no | — |
| class_subject_id | uuid | no | — |
| term_id | uuid | no | — |
| name | text | yes | null |
| created_at | timestamptz | no | now() |

### lessons (tenant-scoped)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| tenant_id | uuid | no | — |
| course_id | uuid | no | — |
| title | text | no | — |
| description | text | yes | null |
| status | lesson_status | no | 'draft' |
| published_at | timestamptz | yes | null |
| created_by | uuid | no | — | profiles.id |
| created_at | timestamptz | no | now() |
| updated_at | timestamptz | no | now() |

### lesson_materials (tenant-scoped)

**Q8 resolved.** Allowlist: PDF, doc (docx), image (jpg, png, webp).

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| tenant_id | uuid | no | — |
| lesson_id | uuid | no | — |
| kind | text | no | — | 'pdf', 'doc', 'image', 'external_video' |
| storage_path | text | yes | null | For uploaded files |
| external_url | text | yes | null | For external video links |
| file_size | bigint | yes | null | |
| mime_type | text | yes | null | Validated server-side against allowlist |
| created_at | timestamptz | no | now() | |

CONSTRAINT: exactly one of storage_path or external_url is non-null.
CONSTRAINT: if storage_path is set, mime_type must be in allowlist.

### gradebook_categories (tenant-scoped) — NEW in v2

**Q3 resolved.** Added in MVP to prevent painful post-launch migrations.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | |
| tenant_id | uuid | no | — | |
| course_id | uuid | no | — | Categories scoped per course |
| name | text | no | — | e.g. "Quizzes", "Exams", "Homework" |
| weight | numeric(5,2) | yes | null | Percentage, 0-100. Null = informational only |
| display_order | integer | no | 0 | |
| created_at | timestamptz | no | now() | |

UNIQUE (course_id, name).

**Validation:** Weights per course should sum to 100 if any are set. Enforced
at application layer in MVP, not DB constraint. A future migration can
tighten this once teacher workflows are validated.

### assessments (tenant-scoped)

Unifies assignments and score-only assessments.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | |
| tenant_id | uuid | no | — | |
| course_id | uuid | no | — | |
| lesson_id | uuid | yes | null | Optional — see Q6 note |
| gradebook_category_id | uuid | yes | null | Null = uncategorized |
| type | assessment_type | no | 'assignment' | |
| title | text | no | — | |
| instructions | text | yes | null | |
| due_date | timestamptz | yes | null | |
| max_score | numeric | yes | null | Required for quiz/test/exam |
| created_by | uuid | no | — | profiles.id |
| published_at | timestamptz | yes | null | |
| created_at | timestamptz | no | now() | |

**Q6 resolved.** `lesson_id` is nullable. Rationale: standalone midterms,
finals, and diagnostic benchmarks don't attach to a single lesson.

**Rule:** If type='assignment', submissions expected. If type IN
('quiz','test','exam'), no submission — grades only.

### submissions (tenant-scoped)

Only for assessments of type `assignment`.

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| tenant_id | uuid | no | — |
| assessment_id | uuid | no | — |
| student_id | uuid | no | — | profiles.id |
| text_content | text | yes | null |
| file_path | text | yes | null |
| submitted_at | timestamptz | no | now() |
| status | text | no | 'submitted' |

Status values: 'submitted', 'returned', 'resubmitted'.

### grades (tenant-scoped)

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | |
| tenant_id | uuid | no | — | |
| assessment_id | uuid | no | — | |
| student_id | uuid | no | — | |
| submission_id | uuid | yes | null | **NULLABLE** — see note |
| score | numeric | yes | null | |
| feedback | text | yes | null | |
| graded_by | uuid | no | — | profiles.id |
| graded_at | timestamptz | no | now() | |
| released_at | timestamptz | yes | null | Null = not visible to student/parent |

UNIQUE (assessment_id, student_id).

**Nullable submission_id rationale:** paper-based quizzes/tests/exams have
no digital submission. Grade exists on its own.

### enrollments (tenant-scoped)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| tenant_id | uuid | no | — |
| student_id | uuid | no | — |
| class_id | uuid | no | — |
| academic_year_id | uuid | no | — |
| enrolled_at | timestamptz | no | now() |

UNIQUE (student_id, class_id, academic_year_id).

### parent_children (tenant-scoped)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| tenant_id | uuid | no | — |
| parent_id | uuid | no | — |
| student_id | uuid | no | — |
| linked_at | timestamptz | no | now() |

UNIQUE (parent_id, student_id).

### teacher_assignments (tenant-scoped)

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| tenant_id | uuid | no | — |
| teacher_id | uuid | no | — |
| class_subject_id | uuid | no | — |
| assigned_at | timestamptz | no | now() |

UNIQUE (teacher_id, class_subject_id).

---

## 6. RLS policy notes

**Tenant-scoped tables (RLS required):**
academic_years, terms, classes, subjects, class_subjects, courses, lessons,
lesson_materials, gradebook_categories, assessments, submissions, grades,
enrollments, parent_children, teacher_assignments

**Standard tenant RLS policy pattern:**

```sql
CREATE POLICY tenant_isolation ON <table>
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

  profiles (self-scoped):

sql
CREATE POLICY profile_self_read ON profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profile_school_admin_read ON profiles
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'school_admin'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

  Parent read-only policy: Parent can SELECT grades and submissions where
student_id is in their parent_children list. No INSERT/UPDATE/DELETE.

School Admin: Full CRUD within own tenant.

Teacher: CRUD on lessons, assessments, grades within own tenant. Read-only
on enrollments and profiles.

Student: SELECT on lessons, assessments, grades, submissions within own
tenant + enrollment. INSERT on submissions. UPDATE on own submissions before
due date.

Platform Admin: Elevated path via service role, bypasses tenant RLS.
Every access logged to audit_log.