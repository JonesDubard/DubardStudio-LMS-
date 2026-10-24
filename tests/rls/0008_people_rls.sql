-- RLS tests for 0008. Run on a database with 0001-0008 applied and NO seed data
-- (it inserts its own two schools). Everything runs in one transaction and is
-- rolled back at the end, so nothing is left behind.
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f 0008_rls_tests.sql
-- Each check prints "ok - ..."; the first failure stops the script with "FAIL - ...".
-- Users get their token claims from the real login hook (custom_access_token_hook).

\pset tuples_only on
\pset format unaligned

BEGIN;

-- ---------------------------------------------------------------------------
-- Test helpers (in a schema that the ROLLBACK at the end removes again)
-- ---------------------------------------------------------------------------

CREATE SCHEMA rls_test;

CREATE FUNCTION rls_test.eq(label text, got bigint, want bigint) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'FAIL - % (got %, want %)', label, got, want;
  END IF;
  RAISE NOTICE 'ok - %', label;
END $$;

CREATE FUNCTION rls_test.is(label text, got text, want text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'FAIL - % (got %, want %)', label, got, want;
  END IF;
  RAISE NOTICE 'ok - %', label;
END $$;

-- Runs a statement and checks how many rows it touched (RLS hides rows silently).
CREATE FUNCTION rls_test.rows(label text, stmt text, want bigint) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  EXECUTE stmt;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM rls_test.eq(label, n, want);
END $$;

-- Runs a statement that must be refused (RLS WITH CHECK, grant, trigger or FK).
-- want_text, when given, must appear in the error, so a test can't pass for the
-- wrong reason (a typo, a missing table).
CREATE FUNCTION rls_test.refused(label text, stmt text, want_text text DEFAULT '') RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF position(want_text IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'FAIL - % (refused, but with "%", expected "%")', label, SQLERRM, want_text;
    END IF;
    RAISE NOTICE 'ok - % (refused: %)', label, SQLERRM;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL - % (was allowed)', label;
END $$;

-- Sign in as a user: claims come from the login hook.
CREATE FUNCTION rls_test.login(uid uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    (public.custom_access_token_hook(jsonb_build_object(
      'user_id', uid, 'claims', jsonb_build_object('sub', uid, 'role', 'authenticated')
    )) -> 'claims')::text, true);
END $$;

GRANT USAGE ON SCHEMA rls_test TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rls_test TO authenticated;

-- ---------------------------------------------------------------------------
-- Data: school A (full setup) and school B (one of each)
--   A: classes 10A and 10B, Maths in both, one term.
--      tA1 teaches 10A Maths, tA3 co-teaches 10A Maths, tA2 teaches 10B Maths.
--      sA1 in 10A, sA2 in 10B. pA1 is sA1's parent. aA is the School Admin.
-- ---------------------------------------------------------------------------

INSERT INTO public.tenants (id, name, subdomain) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'School A', 'school-a'),
  ('b0000000-0000-0000-0000-000000000000', 'School B', 'school-b');

INSERT INTO auth.users (id, email)
SELECT u::uuid, u || '@test' FROM unnest(ARRAY[
  'a1000000-0000-0000-0000-000000000001',  -- aA  admin
  'a2000000-0000-0000-0000-000000000001',  -- tA1 teacher 10A
  'a2000000-0000-0000-0000-000000000002',  -- tA2 teacher 10B
  'a2000000-0000-0000-0000-000000000003',  -- tA3 co-teacher 10A
  'a3000000-0000-0000-0000-000000000001',  -- sA1 student 10A
  'a3000000-0000-0000-0000-000000000002',  -- sA2 student 10B
  'a4000000-0000-0000-0000-000000000001',  -- pA1 parent of sA1
  'b1000000-0000-0000-0000-000000000001',  -- aB
  'b2000000-0000-0000-0000-000000000001',  -- tB
  'b3000000-0000-0000-0000-000000000001'   -- sB
]) AS u;

INSERT INTO public.profiles (id, tenant_id, full_name, email)
SELECT id, CASE WHEN id::text LIKE 'a%' THEN 'a0000000-0000-0000-0000-000000000000'::uuid
                ELSE 'b0000000-0000-0000-0000-000000000000'::uuid END,
       email, email
FROM auth.users;

INSERT INTO public.memberships (tenant_id, profile_id, role)
SELECT p.tenant_id, p.id,
  (CASE substr(p.id::text, 2, 1) WHEN '1' THEN 'school_admin' WHEN '2' THEN 'teacher'
                                 WHEN '3' THEN 'student' ELSE 'parent' END)::public.user_role
FROM public.profiles p;

INSERT INTO public.academic_years (id, tenant_id, name, start_date, end_date, is_current) VALUES
  ('a5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', '2026', '2026-09-01', '2027-07-31', true),
  ('a5000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', '2027', '2027-09-01', '2028-07-31', false),
  ('b5000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000000', '2026', '2026-09-01', '2027-07-31', true);

INSERT INTO public.terms (id, tenant_id, academic_year_id, name, start_date, end_date, is_current) VALUES
  ('a6000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000001', 'T1', '2026-09-01', '2026-12-20', true),
  ('a6000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000002', 'T1', '2027-09-01', '2027-12-20', false),
  ('b6000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000000', 'b5000000-0000-0000-0000-000000000001', 'T1', '2026-09-01', '2026-12-20', true);

INSERT INTO public.classes (id, tenant_id, name) VALUES
  ('a7000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000000', '10A'),
  ('a7000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000000', '10B'),
  ('b7000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000000', '10A');

INSERT INTO public.subjects (id, tenant_id, name) VALUES
  ('a8000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'Maths'),
  ('b8000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000000', 'Maths');

INSERT INTO public.class_subjects (id, tenant_id, class_id, subject_id) VALUES
  ('a9000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000000', 'a7000000-0000-0000-0000-00000000000a', 'a8000000-0000-0000-0000-000000000001'),
  ('a9000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000000', 'a7000000-0000-0000-0000-00000000000b', 'a8000000-0000-0000-0000-000000000001'),
  ('b9000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000000', 'b7000000-0000-0000-0000-00000000000a', 'b8000000-0000-0000-0000-000000000001');

-- Courses: 10A Maths this year (cA), 10B Maths (cB), 10A Maths NEXT year (cA2), school B (cX).
INSERT INTO public.courses (id, tenant_id, class_subject_id, term_id, name, status) VALUES
  ('aa000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-00000000000a', 'a6000000-0000-0000-0000-000000000001', '10A Maths', 'published'),
  ('aa000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-00000000000b', 'a6000000-0000-0000-0000-000000000001', '10B Maths', 'published'),
  ('aa000000-0000-0000-0000-0000000000a2', 'a0000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-00000000000a', 'a6000000-0000-0000-0000-000000000002', '10A Maths 2027', 'published'),
  ('ba000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000000', 'b9000000-0000-0000-0000-00000000000a', 'b6000000-0000-0000-0000-000000000001', 'B Maths', 'published');

-- Admin-only setup rows (as the migration owner; the admin path is tested below).
INSERT INTO public.teacher_assignments (tenant_id, teacher_id, class_subject_id, role) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000001', 'a9000000-0000-0000-0000-00000000000a', 'lead'),
  ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000003', 'a9000000-0000-0000-0000-00000000000a', 'co_teacher'),
  ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000002', 'a9000000-0000-0000-0000-00000000000b', 'lead'),
  ('b0000000-0000-0000-0000-000000000000', 'b2000000-0000-0000-0000-000000000001', 'b9000000-0000-0000-0000-00000000000a', 'lead');

INSERT INTO public.enrollments (tenant_id, student_id, class_id, academic_year_id) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'a3000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-00000000000a', 'a5000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000000', 'a3000000-0000-0000-0000-000000000002', 'a7000000-0000-0000-0000-00000000000b', 'a5000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000000', 'b3000000-0000-0000-0000-000000000001', 'b7000000-0000-0000-0000-00000000000a', 'b5000000-0000-0000-0000-000000000001');

INSERT INTO public.parent_children (tenant_id, parent_id, student_id) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001');

-- Lessons in school A:
--   lP   10A published, by tA1        lD1  10A draft, by tA1
--   lD3  10A draft, by tA3 (co-teacher)
--   lB   10B published, by tA2        lN   10A NEXT YEAR published, by tA1
-- School B: lX published.
INSERT INTO public.lessons (id, tenant_id, course_id, title, status, created_by) VALUES
  ('ab000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-00000000000a', 'lP',  'published', 'a2000000-0000-0000-0000-000000000001'),
  ('ab000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-00000000000a', 'lD1', 'draft',     'a2000000-0000-0000-0000-000000000001'),
  ('ab000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-00000000000a', 'lD3', 'draft',     'a2000000-0000-0000-0000-000000000003'),
  ('ab000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-00000000000b', 'lB',  'published', 'a2000000-0000-0000-0000-000000000002'),
  ('ab000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-0000000000a2', 'lN',  'published', 'a2000000-0000-0000-0000-000000000001'),
  ('bb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000000', 'ba000000-0000-0000-0000-00000000000a', 'lX',  'published', 'b2000000-0000-0000-0000-000000000001');

-- Files + materials: fP on lP, fB on lB, fD on lD1.
INSERT INTO public.files (id, tenant_id, storage_path, original_name, mime_type, size_bytes, uploaded_by) VALUES
  ('ac000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000/lesson/1/p.pdf', 'p.pdf', 'application/pdf', 10, 'a2000000-0000-0000-0000-000000000001'),
  ('ac000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000/lesson/2/b.pdf', 'b.pdf', 'application/pdf', 10, 'a2000000-0000-0000-0000-000000000002'),
  ('ac000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000/lesson/3/d.pdf', 'd.pdf', 'application/pdf', 10, 'a2000000-0000-0000-0000-000000000001');

INSERT INTO public.lesson_materials (id, tenant_id, lesson_id, kind, file_id) VALUES
  ('ad000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'ab000000-0000-0000-0000-000000000001', 'pdf', 'ac000000-0000-0000-0000-000000000001'),
  ('ad000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'ab000000-0000-0000-0000-000000000004', 'pdf', 'ac000000-0000-0000-0000-000000000002'),
  ('ad000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000', 'ab000000-0000-0000-0000-000000000002', 'pdf', 'ac000000-0000-0000-0000-000000000003');

INSERT INTO public.invitations (tenant_id, email, role, token_hash) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'new@test', 'teacher', 'hashA'),
  ('b0000000-0000-0000-0000-000000000000', 'newb@test', 'teacher', 'hashB');

-- ---------------------------------------------------------------------------
-- Role checks (triggers), as the owner
-- ---------------------------------------------------------------------------

SELECT rls_test.refused('a student cannot be assigned as a teacher',
  $$INSERT INTO public.teacher_assignments (tenant_id, teacher_id, class_subject_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a3000000-0000-0000-0000-000000000001', 'a9000000-0000-0000-0000-00000000000b')$$);
SELECT rls_test.refused('a teacher cannot be enrolled as a student',
  $$INSERT INTO public.enrollments (tenant_id, student_id, class_id, academic_year_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-00000000000b', 'a5000000-0000-0000-0000-000000000001')$$);
SELECT rls_test.refused('a teacher cannot be linked as a parent',
  $$INSERT INTO public.parent_children (tenant_id, parent_id, student_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002')$$);
SELECT rls_test.refused('a child in another school cannot be linked',
  $$INSERT INTO public.parent_children (tenant_id, parent_id, student_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001')$$);
SELECT rls_test.refused('an enrolment cannot point at another school''s class',
  $$INSERT INTO public.enrollments (tenant_id, student_id, class_id, academic_year_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a3000000-0000-0000-0000-000000000002', 'b7000000-0000-0000-0000-00000000000a', 'a5000000-0000-0000-0000-000000000001')$$);

SELECT rls_test.refused('a second pending invite for the same email (other casing) is refused',
  $$INSERT INTO public.invitations (tenant_id, email, role, token_hash)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'NEW@Test', 'teacher', 'hashA2')$$,
  'invitations_one_pending_email');
SELECT rls_test.refused('an invitation cannot be accepted by a user of another school',
  $$UPDATE public.invitations SET status = 'accepted', accepted_user_id = 'b3000000-0000-0000-0000-000000000001'
    WHERE token_hash = 'hashA'$$, 'invitations_accepted_user_tenant_fk');
SELECT rls_test.eq('logged-in users cannot call enrolled_course_ids',
  has_function_privilege('authenticated', 'public.enrolled_course_ids(uuid[])', 'EXECUTE')::int, 0);
SELECT rls_test.eq('logged-in users can call student_course_ids',
  has_function_privilege('authenticated', 'public.student_course_ids()', 'EXECUTE')::int, 1);
SELECT rls_test.is('no leftover broad policy on lessons (exact policy list)',
  (SELECT string_agg(policyname, ',' ORDER BY policyname) FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'lessons'),
  'lessons_admin_all,lessons_parent_read,lessons_student_read,lessons_teacher_delete,lessons_teacher_insert,lessons_teacher_read,lessons_teacher_update,tenant_isolation');
SELECT rls_test.is('no leftover broad policy on lesson_materials',
  (SELECT string_agg(policyname, ',' ORDER BY policyname) FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'lesson_materials'),
  'lesson_materials_admin_all,lesson_materials_learner_read,lesson_materials_teacher_read,lesson_materials_teacher_write,tenant_isolation');
SELECT rls_test.is('no leftover broad policy on profiles',
  (SELECT string_agg(policyname, ',' ORDER BY policyname) FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'profiles'),
  'profiles_admin_read,profiles_auth_hook_read,profiles_parent_read_children,profiles_self_read,profiles_teacher_read,tenant_isolation');

-- ---------------------------------------------------------------------------
-- Teacher tA1 (10A Maths)
-- ---------------------------------------------------------------------------

SELECT rls_test.login('a2000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

SELECT rls_test.eq('tA1 sees own published + own draft + own next-year lesson, not tA3''s draft or 10B',
  (SELECT count(*) FROM public.lessons), 3);
SELECT rls_test.eq('tA1 cannot see co-teacher tA3''s draft',
  (SELECT count(*) FROM public.lessons WHERE title = 'lD3'), 0);
SELECT rls_test.eq('tA1 cannot see 10B (unassigned course) lessons',
  (SELECT count(*) FROM public.lessons WHERE title = 'lB'), 0);
SELECT rls_test.eq('tA1 sees materials of lP and lD1 only',
  (SELECT count(*) FROM public.lesson_materials), 2);
SELECT rls_test.rows('tA1 can edit own published lesson',
  $$UPDATE public.lessons SET title = 'lP' WHERE title = 'lP'$$, 1);
SELECT rls_test.rows('tA1 cannot edit tA3''s draft',
  $$UPDATE public.lessons SET title = 'x' WHERE id = 'ab000000-0000-0000-0000-000000000003'$$, 0);
SELECT rls_test.rows('tA1 cannot edit a 10B lesson',
  $$UPDATE public.lessons SET title = 'x' WHERE id = 'ab000000-0000-0000-0000-000000000004'$$, 0);
SELECT rls_test.refused('tA1 cannot add a lesson to 10B (unassigned)',
  $$INSERT INTO public.lessons (tenant_id, course_id, title) VALUES
    ('a0000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-00000000000b', 'new')$$);
SELECT rls_test.rows('tA1 can add a lesson to 10A',
  $$INSERT INTO public.lessons (tenant_id, course_id, title) VALUES
    ('a0000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-00000000000a', 'new')$$, 1);
SELECT rls_test.refused('tA1 cannot move a lesson into 10B',
  $$UPDATE public.lessons SET course_id = 'aa000000-0000-0000-0000-00000000000b' WHERE title = 'lP'$$);
SELECT rls_test.refused('tA1 cannot add a material to a 10B lesson',
  $$INSERT INTO public.lesson_materials (tenant_id, lesson_id, kind, external_url) VALUES
    ('a0000000-0000-0000-0000-000000000000', 'ab000000-0000-0000-0000-000000000004', 'external_video', 'https://v')$$);
SELECT rls_test.rows('tA1 can add a material to own lesson',
  $$INSERT INTO public.lesson_materials (tenant_id, lesson_id, kind, external_url) VALUES
    ('a0000000-0000-0000-0000-000000000000', 'ab000000-0000-0000-0000-000000000001', 'external_video', 'https://v')$$, 1);
SELECT rls_test.eq('tA1 sees staff (aA, tA1, tA2, tA3) + 10A student sA1, not sA2 or parents',
  (SELECT count(*) FROM public.profiles), 5);
SELECT rls_test.eq('tA1 sees own assignment only',
  (SELECT count(*) FROM public.teacher_assignments), 1);
SELECT rls_test.eq('tA1 sees 10A enrolments only',
  (SELECT count(*) FROM public.enrollments), 1);
SELECT rls_test.eq('tA1 sees no parent links', (SELECT count(*) FROM public.parent_children), 0);
SELECT rls_test.eq('tA1 sees no invitations', (SELECT count(*) FROM public.invitations), 0);
SELECT rls_test.refused('tA1 cannot assign self to 10B',
  $$INSERT INTO public.teacher_assignments (tenant_id, teacher_id, class_subject_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000001', 'a9000000-0000-0000-0000-00000000000b')$$);
SELECT rls_test.refused('tA1 cannot enrol a student',
  $$INSERT INTO public.enrollments (tenant_id, student_id, class_id, academic_year_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a3000000-0000-0000-0000-000000000002', 'a7000000-0000-0000-0000-00000000000a', 'a5000000-0000-0000-0000-000000000001')$$);
SELECT rls_test.refused('tA1 cannot call enrolled_course_ids directly',
  $$SELECT public.enrolled_course_ids(ARRAY['a3000000-0000-0000-0000-000000000002'::uuid])$$);

RESET ROLE;

-- Co-teacher tA3 sees tA1's published lesson but not tA1's draft.
SELECT rls_test.login('a2000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;
SELECT rls_test.eq('co-teacher tA3 sees own draft + 10A non-drafts (lP, lN, new is a draft by tA1 -> hidden)',
  (SELECT count(*) FROM public.lessons), 3);
SELECT rls_test.eq('co-teacher tA3 cannot see tA1''s draft',
  (SELECT count(*) FROM public.lessons WHERE title = 'lD1'), 0);
SELECT rls_test.rows('co-teacher tA3 can edit tA1''s published lesson',
  $$UPDATE public.lessons SET title = 'lP' WHERE title = 'lP'$$, 1);
SELECT rls_test.rows('co-teacher tA3 cannot delete tA1''s published lesson',
  $$DELETE FROM public.lessons WHERE title = 'lP'$$, 0);
SELECT rls_test.refused('co-teacher tA3 cannot turn tA1''s published lesson into a draft',
  $$UPDATE public.lessons SET status = 'draft' WHERE title = 'lP'$$, 'row-level security');
SELECT rls_test.refused('co-teacher tA3 cannot take over tA1''s lesson',
  $$UPDATE public.lessons SET created_by = 'a2000000-0000-0000-0000-000000000003' WHERE title = 'lP'$$,
  'created_by cannot be changed');
SELECT rls_test.rows('co-teacher tA3 can archive tA1''s published lesson',
  $$UPDATE public.lessons SET status = 'archived' WHERE title = 'lP'$$, 1);
SELECT rls_test.rows('(put it back)',
  $$UPDATE public.lessons SET status = 'published' WHERE title = 'lP'$$, 1);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- Student sA1 (10A, this year)
-- ---------------------------------------------------------------------------

SELECT rls_test.login('a3000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;
SELECT rls_test.eq('sA1 sees only lP (published, 10A, this year)',
  (SELECT count(*) FROM public.lessons), 1);
SELECT rls_test.eq('sA1 cannot see next year''s 10A lesson (not enrolled that year)',
  (SELECT count(*) FROM public.lessons WHERE title = 'lN'), 0);
SELECT rls_test.eq('sA1 sees lP''s two materials only (file + video link)', (SELECT count(*) FROM public.lesson_materials), 2);
SELECT rls_test.eq('sA1 sees lP''s file only', (SELECT count(*) FROM public.files), 1);
SELECT rls_test.eq('sA1 sees own profile only', (SELECT count(*) FROM public.profiles), 1);
SELECT rls_test.eq('sA1 sees own enrolment only', (SELECT count(*) FROM public.enrollments), 1);
SELECT rls_test.eq('sA1 sees no teacher assignments', (SELECT count(*) FROM public.teacher_assignments), 0);
SELECT rls_test.refused('sA1 cannot enrol self in 10B',
  $$INSERT INTO public.enrollments (tenant_id, student_id, class_id, academic_year_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a3000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-00000000000b', 'a5000000-0000-0000-0000-000000000001')$$);
RESET ROLE;

-- Student sA2 (10B)
SELECT rls_test.login('a3000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;
SELECT rls_test.eq('sA2 sees only lB (10B)', (SELECT count(*) FROM public.lessons), 1);
SELECT rls_test.eq('sA2 cannot see 10A''s file', (SELECT count(*) FROM public.files WHERE original_name = 'p.pdf'), 0);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- Parent pA1 (child sA1)
-- ---------------------------------------------------------------------------

SELECT rls_test.login('a4000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;
SELECT rls_test.eq('pA1 sees only the child''s published lesson lP', (SELECT count(*) FROM public.lessons), 1);
SELECT rls_test.eq('pA1 sees lP''s two materials only', (SELECT count(*) FROM public.lesson_materials), 2);
SELECT rls_test.eq('pA1 sees self + child', (SELECT count(*) FROM public.profiles), 2);
SELECT rls_test.eq('pA1 sees the child''s enrolment only', (SELECT count(*) FROM public.enrollments), 1);
SELECT rls_test.eq('pA1 sees own link only', (SELECT count(*) FROM public.parent_children), 1);
SELECT rls_test.refused('pA1 cannot link another child',
  $$INSERT INTO public.parent_children (tenant_id, parent_id, student_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002')$$);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- School Admin aA
-- ---------------------------------------------------------------------------

SELECT rls_test.login('a1000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;
SELECT rls_test.eq('aA sees every school A lesson, incl. drafts (decision 2)',
  (SELECT count(*) FROM public.lessons), 6);
SELECT rls_test.eq('aA sees school A invitations only', (SELECT count(*) FROM public.invitations), 1);
SELECT rls_test.refused('aA cannot read token_hash',
  $$SELECT token_hash FROM public.invitations$$);
SELECT rls_test.refused('aA cannot create an invitation directly (server only)',
  $$INSERT INTO public.invitations (tenant_id, email, role, token_hash)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'x@test', 'teacher', 'h')$$);
SELECT rls_test.rows('aA can assign tA2 to 10A',
  $$INSERT INTO public.teacher_assignments (tenant_id, teacher_id, class_subject_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000002', 'a9000000-0000-0000-0000-00000000000a')$$, 1);
SELECT rls_test.rows('aA can link pA1 to sA2',
  $$INSERT INTO public.parent_children (tenant_id, parent_id, student_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002')$$, 1);
SELECT rls_test.rows('aA can withdraw an enrolment',
  $$UPDATE public.enrollments SET status = 'withdrawn' WHERE student_id = 'a3000000-0000-0000-0000-000000000002'$$, 1);
SELECT rls_test.refused('aA cannot enrol a student into school B',
  $$INSERT INTO public.enrollments (tenant_id, student_id, class_id, academic_year_id)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'b3000000-0000-0000-0000-000000000001', 'b7000000-0000-0000-0000-00000000000a', 'b5000000-0000-0000-0000-000000000001')$$);
SELECT rls_test.refused('aA cannot move a parent link into school B',
  $$UPDATE public.parent_children SET tenant_id = 'b0000000-0000-0000-0000-000000000000'
    WHERE parent_id = 'a4000000-0000-0000-0000-000000000001'$$);  -- the role-check trigger refuses it first, RLS would too
SELECT rls_test.refused('aA cannot link a school B child to a school A parent',
  $$INSERT INTO public.parent_children (tenant_id, parent_id, student_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001')$$);
SELECT rls_test.eq('aA sees no school B enrolments',
  (SELECT count(*) FROM public.enrollments WHERE tenant_id = 'b0000000-0000-0000-0000-000000000000'), 0);
RESET ROLE;

-- The admin's changes take effect for the others:
SELECT rls_test.login('a2000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;
SELECT rls_test.eq('tA2, now also on 10A, sees lB + 10A non-drafts (lP, lN)', (SELECT count(*) FROM public.lessons), 3);
RESET ROLE;

SELECT rls_test.login('a3000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;
SELECT rls_test.eq('sA2, withdrawn, sees no lessons', (SELECT count(*) FROM public.lessons), 0);
RESET ROLE;

SELECT rls_test.login('a4000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;
SELECT rls_test.eq('pA1 now sees both children', (SELECT count(*) FROM public.profiles), 3);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- One person with two roles: tA4 teaches 10B and is also sA1's parent.
-- Policies are OR-ed, so the result must be exactly the union of both roles.
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, email) VALUES ('a2000000-0000-0000-0000-000000000004', 'tA4@test');
INSERT INTO public.profiles (id, tenant_id, full_name, email)
  VALUES ('a2000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000000', 'tA4', 'tA4@test');
INSERT INTO public.memberships (tenant_id, profile_id, role) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000004', 'teacher'),
  ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000004', 'parent');
INSERT INTO public.teacher_assignments (tenant_id, teacher_id, class_subject_id)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000004', 'a9000000-0000-0000-0000-00000000000b');
INSERT INTO public.parent_children (tenant_id, parent_id, student_id)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000001');

SELECT rls_test.login('a2000000-0000-0000-0000-000000000004');
SET LOCAL ROLE authenticated;
SELECT rls_test.is('teacher+parent sees 10B''s lesson (teacher) + the child''s lP (parent), nothing else',
  (SELECT string_agg(title, ',' ORDER BY title) FROM public.lessons), 'lB,lP');
SELECT rls_test.rows('as a parent of a 10A child, tA4 still cannot edit the 10A lesson',
  $$UPDATE public.lessons SET title = 'x' WHERE title = 'lP'$$, 0);
SELECT rls_test.refused('as a parent of a 10A child, tA4 cannot add a 10A lesson',
  $$INSERT INTO public.lessons (tenant_id, course_id, title) VALUES
    ('a0000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-00000000000a', 'x')$$, 'row-level security');
SELECT rls_test.eq('teacher+parent sees 5 staff + the child (sA2 in 10B is withdrawn)',
  (SELECT count(*) FROM public.profiles), 6);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- School B users see nothing of school A
-- ---------------------------------------------------------------------------

SELECT rls_test.login('b2000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;
SELECT rls_test.eq('tB sees only lX', (SELECT count(*) FROM public.lessons), 1);
SELECT rls_test.eq('tB sees no school A enrolments',
  (SELECT count(*) FROM public.enrollments WHERE tenant_id = 'a0000000-0000-0000-0000-000000000000'), 0);
RESET ROLE;

SELECT rls_test.login('b3000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;
SELECT rls_test.eq('sB sees only lX', (SELECT count(*) FROM public.lessons), 1);
RESET ROLE;

SELECT rls_test.login('b1000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;
SELECT rls_test.eq('aB sees school B invitation only', (SELECT count(*) FROM public.invitations), 1);
SELECT rls_test.eq('aB sees no school A parent links', (SELECT count(*) FROM public.parent_children), 0);
RESET ROLE;

\echo 'All 0008 RLS tests passed. Rolling back.'
ROLLBACK;
