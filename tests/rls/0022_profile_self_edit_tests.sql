-- Tests for the US-005 migration (own-profile edits). Run on a database with all migrations
-- and seed.sql applied (it uses the seed users). Everything runs in one transaction and is
-- rolled back at the end.
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f tests/rls/0022_profile_self_edit_tests.sql
-- Each check prints "ok - ..."; the first failure stops the script with "FAIL - ...".

\pset tuples_only on
\pset format unaligned

BEGIN;

CREATE SCHEMA rls_test;

CREATE FUNCTION rls_test.is(label text, got text, want text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'FAIL - % (got %, want %)', label, got, want;
  END IF;
  RAISE NOTICE 'ok - %', label;
END $$;

-- Runs an UPDATE as the current role and returns how many rows it changed.
-- Row-level security hides other people's rows, so it does NOT raise an error for them: it changes 0 rows.
CREATE FUNCTION rls_test.updated(stmt text) RETURNS int
LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  EXECUTE stmt;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- The statement must be stopped: either an error (no right on that column) or 0 rows changed.
CREATE FUNCTION rls_test.blocked(label text, stmt text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  BEGIN
    EXECUTE stmt;
    GET DIAGNOSTICS n = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ok - % (refused: %)', label, SQLERRM;
    RETURN;
  END;
  IF n = 0 THEN
    RAISE NOTICE 'ok - % (0 rows changed)', label;
    RETURN;
  END IF;
  RAISE EXCEPTION 'FAIL - % (% row(s) were changed)', label, n;
END $$;

-- Must raise an error that contains want_text.
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

-- Signs in as this user for the next statements (what the API does with the user's token).
CREATE FUNCTION rls_test.as_user(uid uuid, tenant uuid, app_role text) RETURNS void
LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
    jsonb_build_object('sub', uid, 'role', 'authenticated',
                       'app_roles', jsonb_build_array(app_role), 'tenant_id', tenant)::text, true)
$$;

GRANT USAGE ON SCHEMA rls_test TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rls_test TO anon, authenticated, service_role;

-- Seed users: school 1 teacher and student, school 2 teacher.
\set school1  '10000000-0000-4000-8000-000000000001'
\set school2  '20000000-0000-4000-8000-000000000001'
\set teacher1 'a1000000-0000-4000-8000-000000000002'
\set student1 'a1000000-0000-4000-8000-000000000003'
\set teacher2 'a2000000-0000-4000-8000-000000000002'

-- Files for the photo tests (inserted as the owner, so no storage or helper is needed).
INSERT INTO public.files (id, tenant_id, storage_path, original_name, mime_type, size_bytes)
VALUES
  ('f1000000-0000-4000-8000-000000000001', :'school1', :'school1' || '/avatars/x/face.png',  'face.png',  'image/png',       100),
  ('f1000000-0000-4000-8000-000000000002', :'school1', :'school1' || '/materials/x/a.pdf',   'a.pdf',     'application/pdf', 100),
  ('f2000000-0000-4000-8000-000000000001', :'school2', :'school2' || '/avatars/x/face.png',  'face.png',  'image/png',       100);

-- ---------------------------------------------------------------------------
-- A teacher edits their own profile
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT rls_test.as_user(:'teacher1', :'school1', 'teacher');

SELECT rls_test.is('teacher can change their own name',
  rls_test.updated($$UPDATE public.profiles SET full_name = 'Renamed Teacher' WHERE id = 'a1000000-0000-4000-8000-000000000002'$$)::text, '1');
SELECT rls_test.is('teacher can change their own phone',
  rls_test.updated($$UPDATE public.profiles SET phone = '+231 555 0100' WHERE id = 'a1000000-0000-4000-8000-000000000002'$$)::text, '1');
SELECT rls_test.is('teacher can set their own photo to an image of their school',
  rls_test.updated($$UPDATE public.profiles SET photo_file_id = 'f1000000-0000-4000-8000-000000000001' WHERE id = 'a1000000-0000-4000-8000-000000000002'$$)::text, '1');
SELECT rls_test.is('teacher can remove their own photo',
  rls_test.updated($$UPDATE public.profiles SET photo_file_id = NULL WHERE id = 'a1000000-0000-4000-8000-000000000002'$$)::text, '1');

SELECT rls_test.refused('photo must be an image (a PDF is refused)',
  $$UPDATE public.profiles SET photo_file_id = 'f1000000-0000-4000-8000-000000000002' WHERE id = 'a1000000-0000-4000-8000-000000000002'$$, 'invalid_photo');
SELECT rls_test.refused('photo from another school is refused',
  $$UPDATE public.profiles SET photo_file_id = 'f2000000-0000-4000-8000-000000000001' WHERE id = 'a1000000-0000-4000-8000-000000000002'$$, 'invalid_photo');

-- ---------------------------------------------------------------------------
-- Someone else's row, and columns that are not allowed
-- ---------------------------------------------------------------------------
SELECT rls_test.is('teacher cannot change a student''s name (0 rows)',
  rls_test.updated($$UPDATE public.profiles SET full_name = 'Hacked' WHERE id = 'a1000000-0000-4000-8000-000000000003'$$)::text, '0');
SELECT rls_test.is('teacher cannot change a student''s phone (0 rows)',
  rls_test.updated($$UPDATE public.profiles SET phone = '000' WHERE id = 'a1000000-0000-4000-8000-000000000003'$$)::text, '0');
SELECT rls_test.is('teacher cannot change another school''s teacher (0 rows)',
  rls_test.updated($$UPDATE public.profiles SET full_name = 'Hacked' WHERE id = 'a2000000-0000-4000-8000-000000000002'$$)::text, '0');
SELECT rls_test.is('a blanket update changes only the teacher''s own row',
  rls_test.updated($$UPDATE public.profiles SET full_name = full_name$$)::text, '1');

SELECT rls_test.blocked('teacher cannot change their own email directly',
  $$UPDATE public.profiles SET email = 'me@elsewhere.test' WHERE id = 'a1000000-0000-4000-8000-000000000002'$$);
SELECT rls_test.blocked('teacher cannot change their own status',
  $$UPDATE public.profiles SET status = 'inactive' WHERE id = 'a1000000-0000-4000-8000-000000000002'$$);
SELECT rls_test.blocked('teacher cannot move themselves to another school',
  $$UPDATE public.profiles SET tenant_id = '20000000-0000-4000-8000-000000000001' WHERE id = 'a1000000-0000-4000-8000-000000000002'$$);
SELECT rls_test.blocked('teacher cannot change their own student number',
  $$UPDATE public.profiles SET student_number = 'S-1' WHERE id = 'a1000000-0000-4000-8000-000000000002'$$);
SELECT rls_test.blocked('teacher cannot change their own id',
  $$UPDATE public.profiles SET id = gen_random_uuid() WHERE id = 'a1000000-0000-4000-8000-000000000002'$$);
SELECT rls_test.blocked('teacher cannot make themselves a school admin (membership role)',
  $$UPDATE public.memberships SET role = 'school_admin' WHERE profile_id = 'a1000000-0000-4000-8000-000000000002'$$);
SELECT rls_test.blocked('teacher cannot change a student''s email either',
  $$UPDATE public.profiles SET email = 'x@elsewhere.test' WHERE id = 'a1000000-0000-4000-8000-000000000003'$$);

-- A student can edit themselves too, and only themselves.
SELECT rls_test.as_user(:'student1', :'school1', 'student');
SELECT rls_test.is('student can change their own name',
  rls_test.updated($$UPDATE public.profiles SET full_name = 'Renamed Student' WHERE id = 'a1000000-0000-4000-8000-000000000003'$$)::text, '1');
SELECT rls_test.is('student cannot change a teacher''s name (0 rows)',
  rls_test.updated($$UPDATE public.profiles SET full_name = 'Hacked' WHERE id = 'a1000000-0000-4000-8000-000000000002'$$)::text, '0');
SELECT rls_test.blocked('student cannot change their own status',
  $$UPDATE public.profiles SET status = 'inactive' WHERE id = 'a1000000-0000-4000-8000-000000000003'$$);

-- Anonymous callers can change nothing.
RESET ROLE;
SET LOCAL ROLE anon;
SELECT rls_test.blocked('anonymous cannot change any profile',
  $$UPDATE public.profiles SET full_name = 'Hacked'$$);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- The values really changed, and nothing else did (read as the owner of the database)
-- ---------------------------------------------------------------------------
SELECT rls_test.is('the teacher''s new name and phone were saved',
  (SELECT full_name || '|' || phone FROM public.profiles WHERE id = :'teacher1'), 'Renamed Teacher|+231 555 0100');
SELECT rls_test.is('the student''s name was not touched by the teacher',
  (SELECT (full_name <> 'Hacked')::text FROM public.profiles WHERE id = :'student1'), 'true');
SELECT rls_test.is('the teacher''s email, status and school are unchanged',
  (SELECT (email = 'teacher@pilot1.test' AND status = 'active' AND tenant_id = :'school1'::uuid)::text
   FROM public.profiles WHERE id = :'teacher1'), 'true');

-- ---------------------------------------------------------------------------
-- A confirmed email change in Supabase Auth reaches the profile
-- (auth.users.email only changes after the user confirms the new address)
-- ---------------------------------------------------------------------------
UPDATE auth.users SET email = 'New.Address@pilot1.test' WHERE id = :'teacher1';
SELECT rls_test.is('profile email follows the confirmed Auth email (lowercase)',
  (SELECT email FROM public.profiles WHERE id = :'teacher1'), 'new.address@pilot1.test');
SELECT rls_test.is('other people''s emails are untouched',
  (SELECT email FROM public.profiles WHERE id = :'student1'), 'student@pilot1.test');

\echo 'All US-005 profile tests passed. Rolling back.'
ROLLBACK;