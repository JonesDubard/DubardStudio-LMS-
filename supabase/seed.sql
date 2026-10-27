-- supabase/seed.sql
-- Dev and test data: two schools, one login per role in each (school_admin,
-- teacher, student, parent), plus a platform admin. Runs automatically after
-- the migrations on `supabase db reset`. Safe to run again (ON CONFLICT DO NOTHING).
--
-- Logins and passwords are listed in the README ("Local dev data").
-- IDs are derived from labels, e.g. md5('pilot1:course')::uuid, so they are
-- the same on every machine and every run.
--
-- UPDATE THIS FILE WHENEVER A MIGRATION ADDS A TABLE. Placeholders for the
-- tables that are still to come are at the bottom.
--
-- Matches the schema after migrations 0001-0009. The blocks for later migrations
-- (files, roster, assessments) only run if their tables exist, so the seed also
-- works on a database that has not applied them yet.

BEGIN;

DROP TABLE IF EXISTS seed_schools;
DROP TABLE IF EXISTS seed_users;

-- ---------------------------------------------------------------------------
-- What to seed (one place to edit)
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE seed_schools (
  slug text PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  subdomain text NOT NULL,
  primary_color text NOT NULL,
  secondary_color text NOT NULL,
  class_name text NOT NULL,
  grade_level text NOT NULL,
  subject_name text NOT NULL,
  lesson_1 text NOT NULL,
  lesson_2 text NOT NULL,
  lesson_3_draft text NOT NULL,
  video_url text NOT NULL
);

-- Different class, subject and lesson names per school, so an isolation test
-- can tell at a glance whose data it is looking at.
INSERT INTO seed_schools VALUES
  ('pilot1', '10000000-0000-4000-8000-000000000001', 'Pilot School #1', 'pilot1',
   '#1d4ed8', '#93c5fd', 'Grade 5', '5', 'Mathematics',
   'Fractions: Introduction', 'Fractions: Adding and Subtracting', 'Fractions: Review (draft)',
   'https://www.youtube.com/watch?v=pilot1-fractions'),
  ('pilot2', '20000000-0000-4000-8000-000000000001', 'Pilot School #2', 'pilot2',
   '#047857', '#6ee7b7', 'Grade 7', '7', 'English',
   'Grammar: Nouns', 'Grammar: Verbs', 'Grammar: Tenses (draft)',
   'https://www.youtube.com/watch?v=pilot2-grammar');

CREATE TEMP TABLE seed_users (
  id uuid PRIMARY KEY,
  slug text NOT NULL REFERENCES seed_schools (slug),
  role public.user_role NOT NULL,
  email text NOT NULL,
  password text NOT NULL,
  full_name text NOT NULL,
  phone text,
  student_number text
);

INSERT INTO seed_users VALUES
  ('a1000000-0000-4000-8000-000000000001', 'pilot1', 'school_admin', 'admin@pilot1.test',   'Pilot-School-1', 'Ama Admin (School 1)',    NULL, NULL),
  ('a1000000-0000-4000-8000-000000000002', 'pilot1', 'teacher',      'teacher@pilot1.test', 'Pilot-School-1', 'Tom Teacher (School 1)',  NULL, NULL),
  ('a1000000-0000-4000-8000-000000000003', 'pilot1', 'student',      'student@pilot1.test', 'Pilot-School-1', 'Sam Student (School 1)',  NULL, 'P1-0001'),
  ('a1000000-0000-4000-8000-000000000004', 'pilot1', 'parent',       'parent@pilot1.test',  'Pilot-School-1', 'Pat Parent (School 1)',   '+231770000001', NULL),
  ('a2000000-0000-4000-8000-000000000001', 'pilot2', 'school_admin', 'admin@pilot2.test',   'Pilot-School-2', 'Abena Admin (School 2)',  NULL, NULL),
  ('a2000000-0000-4000-8000-000000000002', 'pilot2', 'teacher',      'teacher@pilot2.test', 'Pilot-School-2', 'Tina Teacher (School 2)', NULL, NULL),
  ('a2000000-0000-4000-8000-000000000003', 'pilot2', 'student',      'student@pilot2.test', 'Pilot-School-2', 'Sara Student (School 2)', NULL, 'P2-0001'),
  ('a2000000-0000-4000-8000-000000000004', 'pilot2', 'parent',       'parent@pilot2.test',  'Pilot-School-2', 'Paul Parent (School 2)',  '+231770000002', NULL);

-- ---------------------------------------------------------------------------
-- Platform admin (no school, no profile: signs in with no tenant_id claim)
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'platform@liberia-lms.test',
  extensions.crypt('Platform-Admin-1', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Plato Platform"}'::jsonb, now(), now(),
  '', '', '', '', '', '', '', ''
) ON CONFLICT DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES (
  gen_random_uuid(), 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'email',
  jsonb_build_object('sub', 'a0000000-0000-4000-8000-000000000001', 'email', 'platform@liberia-lms.test',
                     'email_verified', true, 'phone_verified', false),
  now(), now(), now()
) ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Schools (tenants)
-- ---------------------------------------------------------------------------

INSERT INTO public.tenants (
  id, name, subdomain, subscription_status, grade_capture_mode,
  primary_color, secondary_color, contact_name, contact_email, plan_code, onboarding_status
)
SELECT s.tenant_id, s.name, s.subdomain, 'active', 'lms',
       s.primary_color, s.secondary_color,
       u.full_name, u.email, 'pilot', 'complete'
FROM seed_schools s
JOIN seed_users u ON u.slug = s.slug AND u.role = 'school_admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_admins (id, full_name, email, is_active)
VALUES ('a0000000-0000-4000-8000-000000000001', 'Plato Platform', 'platform@liberia-lms.test', true)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Logins: auth.users + auth.identities
-- (token columns must be '' not NULL, or Supabase Auth fails on sign-in)
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
SELECT '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt(u.password, extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('full_name', u.full_name), now(), now(),
       '', '', '', '', '', '', '', ''
FROM seed_users u
ON CONFLICT DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email,
                          'email_verified', true, 'phone_verified', false),
       now(), now(), now()
FROM seed_users u
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- People: profiles + memberships (the role lives in memberships since 0005)
-- ---------------------------------------------------------------------------

INSERT INTO public.profiles (id, tenant_id, full_name, email, phone, student_number)
SELECT u.id, s.tenant_id, u.full_name, u.email, u.phone, u.student_number
FROM seed_users u JOIN seed_schools s ON s.slug = u.slug
ON CONFLICT DO NOTHING;

INSERT INTO public.memberships (tenant_id, profile_id, role)
SELECT s.tenant_id, u.id, u.role
FROM seed_users u JOIN seed_schools s ON s.slug = u.slug
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Academic structure: year, three terms (Term 1 is current), class, subject,
-- class-subject link
-- ---------------------------------------------------------------------------

INSERT INTO public.academic_years (id, tenant_id, name, start_date, end_date, is_current)
SELECT md5(s.slug || ':year')::uuid, s.tenant_id, '2026/2027', DATE '2026-09-01', DATE '2027-07-31', true
FROM seed_schools s
ON CONFLICT DO NOTHING;

INSERT INTO public.terms (id, tenant_id, academic_year_id, name, sequence, start_date, end_date, is_current)
SELECT md5(s.slug || ':term:' || t.seq)::uuid, s.tenant_id, md5(s.slug || ':year')::uuid,
       t.name, t.seq, t.starts, t.ends, t.is_current
FROM seed_schools s
CROSS JOIN (VALUES
  (1, 'Term 1', DATE '2026-09-01', DATE '2026-12-18', true),
  (2, 'Term 2', DATE '2027-01-04', DATE '2027-04-09', false),
  (3, 'Term 3', DATE '2027-04-26', DATE '2027-07-31', false)
) AS t(seq, name, starts, ends, is_current)
ON CONFLICT DO NOTHING;

INSERT INTO public.classes (id, tenant_id, name, grade_level)
SELECT md5(s.slug || ':class')::uuid, s.tenant_id, s.class_name, s.grade_level
FROM seed_schools s
ON CONFLICT DO NOTHING;

INSERT INTO public.subjects (id, tenant_id, name)
SELECT md5(s.slug || ':subject')::uuid, s.tenant_id, s.subject_name
FROM seed_schools s
ON CONFLICT DO NOTHING;

INSERT INTO public.class_subjects (id, tenant_id, class_id, subject_id)
SELECT md5(s.slug || ':class_subject')::uuid, s.tenant_id,
       md5(s.slug || ':class')::uuid, md5(s.slug || ':subject')::uuid
FROM seed_schools s
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Course (class-subject in Term 1), gradebook categories, lessons, materials
-- ---------------------------------------------------------------------------

INSERT INTO public.courses (id, tenant_id, class_subject_id, term_id, name, description, status)
SELECT md5(s.slug || ':course')::uuid, s.tenant_id, md5(s.slug || ':class_subject')::uuid,
       md5(s.slug || ':term:1')::uuid, s.subject_name || ' (Term 1)',
       'Seeded course for local development and isolation tests', 'published'
FROM seed_schools s
ON CONFLICT DO NOTHING;

INSERT INTO public.gradebook_categories (id, tenant_id, course_id, name, weight, display_order)
SELECT md5(s.slug || ':category:' || c.name)::uuid, s.tenant_id, md5(s.slug || ':course')::uuid,
       c.name, c.weight, c.display_order
FROM seed_schools s
CROSS JOIN (VALUES ('Quizzes', 20::numeric, 1), ('Tests', 30::numeric, 2), ('Exams', 50::numeric, 3))
  AS c(name, weight, display_order)
ON CONFLICT DO NOTHING;

-- Two published lessons and one draft, written by the school's teacher.
INSERT INTO public.lessons (id, tenant_id, course_id, title, description, status, published_at, created_by, sort_order)
SELECT md5(s.slug || ':lesson:' || l.n)::uuid, s.tenant_id, md5(s.slug || ':course')::uuid,
       l.title, 'Seeded lesson ' || l.n,
       l.status::public.lesson_status,
       CASE WHEN l.status = 'published' THEN now() END,
       t.id, l.n
FROM (
  SELECT s2.slug, 1 AS n, s2.lesson_1 AS title, 'published' AS status FROM seed_schools s2
  UNION ALL SELECT s2.slug, 2, s2.lesson_2, 'published' FROM seed_schools s2
  UNION ALL SELECT s2.slug, 3, s2.lesson_3_draft, 'draft' FROM seed_schools s2
) l
JOIN seed_schools s ON s.slug = l.slug
JOIN seed_users t ON t.slug = s.slug AND t.role = 'teacher'
ON CONFLICT DO NOTHING;

-- Materials: a PDF on lesson 1 and an external video on lesson 2.
-- The PDF path follows {tenant_id}/{resource_type}/{resource_id}/{file}; no object
-- is uploaded to Storage, so opening it will 404.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lesson_materials' AND column_name = 'file_id'
  ) THEN
    -- 0007 and later: the PDF is a row in files, uploaded by the teacher.
    INSERT INTO public.files (id, tenant_id, storage_path, original_name, mime_type, size_bytes, uploaded_by, scan_status)
    SELECT md5(s.slug || ':file:worksheet')::uuid, s.tenant_id,
           s.tenant_id || '/lesson_materials/' || md5(s.slug || ':lesson:1')::uuid || '/worksheet.pdf',
           'worksheet.pdf', 'application/pdf', 20480, t.id, 'clean'
    FROM seed_schools s
    JOIN seed_users t ON t.slug = s.slug AND t.role = 'teacher'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.lesson_materials (id, tenant_id, lesson_id, kind, file_id, sort_order)
    SELECT md5(s.slug || ':material:pdf')::uuid, s.tenant_id, md5(s.slug || ':lesson:1')::uuid,
           'pdf', md5(s.slug || ':file:worksheet')::uuid, 0
    FROM seed_schools s
    ON CONFLICT DO NOTHING;

    INSERT INTO public.lesson_materials (id, tenant_id, lesson_id, kind, external_url, sort_order)
    SELECT md5(s.slug || ':material:video')::uuid, s.tenant_id, md5(s.slug || ':lesson:2')::uuid,
           'external_video', s.video_url, 1
    FROM seed_schools s
    ON CONFLICT DO NOTHING;
  ELSE
    -- Before 0007: file details sit on lesson_materials itself.
    INSERT INTO public.lesson_materials (id, tenant_id, lesson_id, kind, storage_path, external_url, file_size, mime_type)
    SELECT md5(s.slug || ':material:pdf')::uuid, s.tenant_id, md5(s.slug || ':lesson:1')::uuid, 'pdf',
           s.tenant_id || '/lesson_materials/' || md5(s.slug || ':lesson:1')::uuid || '/worksheet.pdf',
           NULL, 20480, 'application/pdf'
    FROM seed_schools s
    ON CONFLICT DO NOTHING;

    INSERT INTO public.lesson_materials (id, tenant_id, lesson_id, kind, storage_path, external_url, file_size, mime_type)
    SELECT md5(s.slug || ':material:video')::uuid, s.tenant_id, md5(s.slug || ':lesson:2')::uuid, 'external_video',
           NULL, s.video_url, NULL, NULL
    FROM seed_schools s
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Roster (0008): without these rows a teacher, student or parent sees no lessons
-- at all, because access follows teacher_assignments / enrollments /
-- parent_children. Skipped on a database that has not applied 0008 yet.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.teacher_assignments') IS NOT NULL THEN
    INSERT INTO public.teacher_assignments (id, tenant_id, teacher_id, class_subject_id, role)
    SELECT md5(s.slug || ':teacher_assignment')::uuid, s.tenant_id, t.id,
           md5(s.slug || ':class_subject')::uuid, 'lead'
    FROM seed_schools s
    JOIN seed_users t ON t.slug = s.slug AND t.role = 'teacher'
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('public.enrollments') IS NOT NULL THEN
    INSERT INTO public.enrollments (id, tenant_id, student_id, class_id, academic_year_id, status)
    SELECT md5(s.slug || ':enrollment')::uuid, s.tenant_id, st.id,
           md5(s.slug || ':class')::uuid, md5(s.slug || ':year')::uuid, 'active'
    FROM seed_schools s
    JOIN seed_users st ON st.slug = s.slug AND st.role = 'student'
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('public.parent_children') IS NOT NULL THEN
    INSERT INTO public.parent_children (id, tenant_id, parent_id, student_id, relationship)
    SELECT md5(s.slug || ':parent_child')::uuid, s.tenant_id, p.id, st.id, 'parent'
    FROM seed_schools s
    JOIN seed_users p  ON p.slug  = s.slug AND p.role  = 'parent'
    JOIN seed_users st ON st.slug = s.slug AND st.role = 'student'
    ON CONFLICT DO NOTHING;
  END IF;

  -- One pending invitation per school, for onboarding screens and tests.
  -- (The token itself is not recoverable; only its hash is stored.)
  IF to_regclass('public.invitations') IS NOT NULL THEN
    INSERT INTO public.invitations (id, tenant_id, email, role, invited_by, token_hash, status)
    SELECT md5(s.slug || ':invitation')::uuid, s.tenant_id, 'new.teacher@' || s.subdomain || '.test',
           'teacher', a.id, md5('seed-token:' || s.slug), 'pending'
    FROM seed_schools s
    JOIN seed_users a ON a.slug = s.slug AND a.role = 'school_admin'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Assessments (0009): per school, one online assignment on lesson 1 (handed in
-- by the student, graded and released), and one paper quiz with no lesson (graded
-- by the teacher, not released yet, so students and parents cannot see it).
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.assessments') IS NOT NULL THEN
    INSERT INTO public.assessments (
      id, tenant_id, course_id, lesson_id, gradebook_category_id, type, title, instructions,
      due_date, assessed_on, max_score, allow_text_entry, allow_file_upload, status, created_by
    )
    SELECT md5(s.slug || ':assessment:assignment')::uuid, s.tenant_id, md5(s.slug || ':course')::uuid,
           md5(s.slug || ':lesson:1')::uuid, NULL, 'assignment', 'Assignment: ' || s.lesson_1,
           'Answer the questions and hand in before the due date.',
           TIMESTAMPTZ '2026-12-01 17:00:00+00', NULL, 20, true, true, 'published', t.id
    FROM seed_schools s
    JOIN seed_users t ON t.slug = s.slug AND t.role = 'teacher'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.assessments (
      id, tenant_id, course_id, lesson_id, gradebook_category_id, type, title, instructions,
      due_date, assessed_on, max_score, allow_text_entry, allow_file_upload, status, created_by
    )
    SELECT md5(s.slug || ':assessment:quiz')::uuid, s.tenant_id, md5(s.slug || ':course')::uuid,
           NULL, md5(s.slug || ':category:Quizzes')::uuid, 'quiz', 'Paper quiz: ' || s.subject_name,
           'Taken on paper in class. The teacher enters the scores.',
           NULL, DATE '2026-10-20', 20, false, false, 'published', t.id
    FROM seed_schools s
    JOIN seed_users t ON t.slug = s.slug AND t.role = 'teacher'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.submissions (id, tenant_id, assessment_id, student_id, text_content)
    SELECT md5(s.slug || ':submission')::uuid, s.tenant_id, md5(s.slug || ':assessment:assignment')::uuid,
           st.id, 'Seeded answer written by the student.'
    FROM seed_schools s
    JOIN seed_users st ON st.slug = s.slug AND st.role = 'student'
    ON CONFLICT DO NOTHING;

    -- Released grade with a submission.
    INSERT INTO public.grades (id, tenant_id, assessment_id, student_id, submission_id, graded_by, score, feedback, released_at)
    SELECT md5(s.slug || ':grade:assignment')::uuid, s.tenant_id, md5(s.slug || ':assessment:assignment')::uuid,
           st.id, md5(s.slug || ':submission')::uuid, t.id, 17, 'Good work.', now()
    FROM seed_schools s
    JOIN seed_users st ON st.slug = s.slug AND st.role = 'student'
    JOIN seed_users t  ON t.slug  = s.slug AND t.role  = 'teacher'
    ON CONFLICT DO NOTHING;

    -- Paper quiz grade: no submission, not released.
    INSERT INTO public.grades (id, tenant_id, assessment_id, student_id, submission_id, graded_by, score, feedback, released_at)
    SELECT md5(s.slug || ':grade:quiz')::uuid, s.tenant_id, md5(s.slug || ':assessment:quiz')::uuid,
           st.id, NULL, t.id, 15, NULL, NULL
    FROM seed_schools s
    JOIN seed_users st ON st.slug = s.slug AND st.role = 'student'
    JOIN seed_users t  ON t.slug  = s.slug AND t.role  = 'teacher'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Self-check: fail the reset loudly if the seed did not produce what the
-- isolation tests expect.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tenant_id, slug FROM seed_schools LOOP
    IF (SELECT count(DISTINCT role) FROM public.memberships WHERE tenant_id = t.tenant_id) <> 4 THEN
      RAISE EXCEPTION 'seed: % should have one membership for each of the 4 roles', t.slug;
    END IF;
    IF (SELECT count(*) FROM public.lessons WHERE tenant_id = t.tenant_id) <> 3
       OR (SELECT count(*) FROM public.lesson_materials WHERE tenant_id = t.tenant_id) <> 2
       OR (SELECT count(*) FROM public.gradebook_categories WHERE tenant_id = t.tenant_id) <> 3
       OR (SELECT count(*) FROM public.terms WHERE tenant_id = t.tenant_id) <> 3 THEN
      RAISE EXCEPTION 'seed: % has the wrong number of lessons, materials, categories or terms', t.slug;
    END IF;
    IF to_regclass('public.assessments') IS NOT NULL THEN
      IF (SELECT count(*) FROM public.assessments WHERE tenant_id = t.tenant_id) <> 2
         OR (SELECT count(*) FROM public.submissions WHERE tenant_id = t.tenant_id) <> 1
         OR (SELECT count(*) FROM public.grades WHERE tenant_id = t.tenant_id) <> 2 THEN
        RAISE EXCEPTION 'seed: % should have 2 assessments, 1 submission and 2 grades', t.slug;
      END IF;
    END IF;
    -- Nested on purpose: a single IF ... AND (SELECT ... FROM missing_table) is
    -- planned as a whole and would fail before 0008 exists.
    IF to_regclass('public.enrollments') IS NOT NULL THEN
      IF (SELECT count(*) FROM public.enrollments WHERE tenant_id = t.tenant_id) <> 1
         OR (SELECT count(*) FROM public.teacher_assignments WHERE tenant_id = t.tenant_id) <> 1
         OR (SELECT count(*) FROM public.parent_children WHERE tenant_id = t.tenant_id) <> 1 THEN
        RAISE EXCEPTION 'seed: % should have one enrolment, one teacher assignment and one parent link', t.slug;
      END IF;
    END IF;
  END LOOP;
END $$;

DROP TABLE seed_users;
DROP TABLE seed_schools;

-- ---------------------------------------------------------------------------
-- STILL TO ADD as migrations land (do not delete this list; tick it off)
-- ---------------------------------------------------------------------------
-- 0007 files          : DONE above (materials use files when it exists).
-- 0008 people         : DONE above (roster + one pending invitation). import_jobs
--                       has no seed yet; add one finished job if a screen needs it.
-- 0009 assessments    : DONE above (assignment + submission + released grade, and
--                       a paper quiz with an unreleased grade, in each school).
--                       No student-uploaded submission file is seeded yet.
-- 0010 platform       : audit_log rows are written by provision_tenant(); no seed.

COMMIT;