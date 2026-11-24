-- Tests for 0019 (US-030): a School Admin invites a teacher, create only, no duplicates.
-- Run on a database with 0001-0019 applied; everything is rolled back at the end.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f tests/rls/0019_create_school_invitation_tests.sql
\pset tuples_only on
\pset format unaligned
BEGIN;
CREATE SCHEMA rls_test;
CREATE FUNCTION rls_test.is(label text, got text, want text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN RAISE EXCEPTION 'FAIL - % (got %, want %)', label, got, want; END IF;
  RAISE NOTICE 'ok - %', label;
END $$;
CREATE FUNCTION rls_test.refused(label text, stmt text, want_text text DEFAULT '') RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF position(want_text IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'FAIL - % (refused, but with "%", expected "%")', label, SQLERRM, want_text;
    END IF;
    RAISE NOTICE 'ok - % (refused: %)', label, SQLERRM; RETURN;
  END;
  RAISE EXCEPTION 'FAIL - % (was allowed)', label;
END $$;
GRANT USAGE ON SCHEMA rls_test TO service_role, authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rls_test TO service_role, authenticated, anon;

-- Helpers: a fake token hash made of one repeated character, and "how many invitations"
CREATE FUNCTION rls_test.h(c char) RETURNS text LANGUAGE sql AS $$ SELECT repeat(c::text, 64) $$;
CREATE FUNCTION rls_test.n(tenant uuid) RETURNS text LANGUAGE sql AS $$
  SELECT count(*)::text FROM public.invitations WHERE tenant_id = tenant $$;
GRANT EXECUTE ON FUNCTION rls_test.h(char), rls_test.n(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Data
--   e1 Teach School (active): admin, second admin (removed), teacher, parent, existing teacher
--   e2 Other School (active): its own admin
--   e3 Frozen School (suspended): its own admin
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'admin19@test'),
  ('e1000000-0000-0000-0000-000000000002', 'gone19@test'),
  ('e1000000-0000-0000-0000-000000000003', 'teacher19@test'),
  ('e1000000-0000-0000-0000-000000000004', 'parent19@test'),
  ('e2000000-0000-0000-0000-000000000001', 'other19@test'),
  ('e3000000-0000-0000-0000-000000000001', 'frozen19@test');

INSERT INTO public.tenants (id, name, subdomain, subscription_status) VALUES
  ('e1000000-0000-0000-0000-000000000000', 'Teach School',  'teach-school-19',  'active'),
  ('e2000000-0000-0000-0000-000000000000', 'Other School',  'other-school-19',  'active'),
  ('e3000000-0000-0000-0000-000000000000', 'Frozen School', 'frozen-school-19', 'suspended');

INSERT INTO public.profiles (id, tenant_id, full_name, email, status) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000000', 'Admin 19',   'admin19@test',   'active'),
  ('e1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000000', 'Gone 19',    'gone19@test',    'active'),
  ('e1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000000', 'Teacher 19', 'Teacher19@Example.Test', 'active'),
  ('e1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000000', 'Parent 19',  'parent19@test',  'active'),
  ('e2000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000000', 'Other 19',   'other19@test',   'active'),
  ('e3000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000000', 'Frozen 19',  'frozen19@test',  'active');

INSERT INTO public.memberships (tenant_id, profile_id, role, status) VALUES
  ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000001', 'school_admin', 'active'),
  ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000002', 'school_admin', 'active'),
  ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000003', 'teacher',      'active'),
  ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000004', 'parent',       'active'),
  ('e2000000-0000-0000-0000-000000000000', 'e2000000-0000-0000-0000-000000000001', 'school_admin', 'active'),
  ('e3000000-0000-0000-0000-000000000000', 'e3000000-0000-0000-0000-000000000001', 'school_admin', 'active');
-- The second admin is removed afterwards (the last-admin guard allows it: Admin 19 stays).
UPDATE public.memberships SET status = 'removed'
WHERE profile_id = 'e1000000-0000-0000-0000-000000000002' AND role = 'school_admin';

SET LOCAL ROLE service_role;

-- ---------------------------------------------------------------------------
-- 1. A School Admin can invite a teacher
-- ---------------------------------------------------------------------------
SELECT rls_test.is('a School Admin invites a teacher: one new invitation, not a reuse',
  (SELECT reused::text FROM public.create_school_invitation(
     'e1000000-0000-0000-0000-000000000000', '  New.Teacher@Example.test ', 'teacher',
     'e1000000-0000-0000-0000-000000000001', rls_test.h('a'))),
  'false');
SELECT rls_test.is('exactly one invitation in the school', rls_test.n('e1000000-0000-0000-0000-000000000000'), '1');
SELECT rls_test.is('it is pending, unsent, a teacher invite, lowercase email, 7 days, the admin as inviter',
  (SELECT status || '/' || (sent_at IS NULL) || '/' || role || '/' || email || '/'
          || (expires_at > now() + interval '6 days 23 hours') || '/' || invited_by
   FROM public.invitations WHERE tenant_id = 'e1000000-0000-0000-0000-000000000000'),
  'pending/true/teacher/new.teacher@example.test/true/e1000000-0000-0000-0000-000000000001');

-- ---------------------------------------------------------------------------
-- 2. No duplicates: a second invite to the same email is refused, nothing changes
-- ---------------------------------------------------------------------------
SELECT rls_test.refused('the same email again is refused with already_invited',
  $q$SELECT * FROM public.create_school_invitation('e1000000-0000-0000-0000-000000000000',
     'NEW.TEACHER@example.test', 'teacher', 'e1000000-0000-0000-0000-000000000001', repeat('b', 64))$q$,
  'already_invited');
SELECT rls_test.is('still exactly one invitation', rls_test.n('e1000000-0000-0000-0000-000000000000'), '1');
SELECT rls_test.is('the first link was not replaced (the refusal changed nothing)',
  (SELECT (token_hash = rls_test.h('a'))::text FROM public.invitations
   WHERE tenant_id = 'e1000000-0000-0000-0000-000000000000'), 'true');

-- An invite that ran out of time but is still open also counts: Resend is the way to renew it.
UPDATE public.invitations SET expires_at = now() - interval '1 day'
WHERE tenant_id = 'e1000000-0000-0000-0000-000000000000';
SELECT rls_test.refused('an open invite that ran out of time is also refused (use Resend)',
  $q$SELECT * FROM public.create_school_invitation('e1000000-0000-0000-0000-000000000000',
     'new.teacher@example.test', 'teacher', 'e1000000-0000-0000-0000-000000000001', repeat('c', 64))$q$,
  'already_invited');

-- Someone who is already a teacher here does not get an invite (email matched without case).
SELECT rls_test.refused('an existing teacher of this school is refused with already_member',
  $q$SELECT * FROM public.create_school_invitation('e1000000-0000-0000-0000-000000000000',
     'teacher19@example.test', 'teacher', 'e1000000-0000-0000-0000-000000000001', repeat('d', 64))$q$,
  'already_member');

-- A used or revoked invite does not block a new one.
UPDATE public.invitations SET status = 'revoked'
WHERE tenant_id = 'e1000000-0000-0000-0000-000000000000';
SELECT rls_test.is('after the old invite is revoked, a new invite can be made',
  (SELECT reused::text FROM public.create_school_invitation(
     'e1000000-0000-0000-0000-000000000000', 'new.teacher@example.test', 'teacher',
     'e1000000-0000-0000-0000-000000000001', rls_test.h('e'))),
  'false');
SELECT rls_test.is('two rows now: the revoked one and the new open one',
  rls_test.n('e1000000-0000-0000-0000-000000000000'), '2');

-- ---------------------------------------------------------------------------
-- 3. Only an active School Admin of THIS school can invite
-- ---------------------------------------------------------------------------
SELECT rls_test.refused('a teacher cannot invite',
  $q$SELECT * FROM public.create_school_invitation('e1000000-0000-0000-0000-000000000000',
     'x1@example.test', 'teacher', 'e1000000-0000-0000-0000-000000000003', repeat('f', 64))$q$,
  'not_school_admin');
SELECT rls_test.refused('a parent cannot invite',
  $q$SELECT * FROM public.create_school_invitation('e1000000-0000-0000-0000-000000000000',
     'x2@example.test', 'teacher', 'e1000000-0000-0000-0000-000000000004', repeat('f', 64))$q$,
  'not_school_admin');
SELECT rls_test.refused('a removed School Admin cannot invite',
  $q$SELECT * FROM public.create_school_invitation('e1000000-0000-0000-0000-000000000000',
     'x3@example.test', 'teacher', 'e1000000-0000-0000-0000-000000000002', repeat('f', 64))$q$,
  'not_school_admin');
SELECT rls_test.refused('another school''s admin cannot invite into this school',
  $q$SELECT * FROM public.create_school_invitation('e1000000-0000-0000-0000-000000000000',
     'x4@example.test', 'teacher', 'e2000000-0000-0000-0000-000000000001', repeat('f', 64))$q$,
  'not_school_admin');
SELECT rls_test.refused('no inviter at all is refused',
  $q$SELECT * FROM public.create_school_invitation('e1000000-0000-0000-0000-000000000000',
     'x5@example.test', 'teacher', NULL, repeat('f', 64))$q$,
  'not_school_admin');
SELECT rls_test.is('none of the refused calls made an invitation',
  rls_test.n('e1000000-0000-0000-0000-000000000000'), '2');
SELECT rls_test.is('the other school got nothing', rls_test.n('e2000000-0000-0000-0000-000000000000'), '0');

-- The other school's admin CAN invite into their own school (the check is per school, not global).
SELECT rls_test.is('the other school''s admin invites into their own school',
  (SELECT reused::text FROM public.create_school_invitation(
     'e2000000-0000-0000-0000-000000000000', 'new.teacher@example.test', 'teacher',
     'e2000000-0000-0000-0000-000000000001', rls_test.h('9'))),
  'false');

-- ---------------------------------------------------------------------------
-- 4. A suspended school, and bad input
-- ---------------------------------------------------------------------------
SELECT rls_test.refused('a suspended school cannot invite',
  $q$SELECT * FROM public.create_school_invitation('e3000000-0000-0000-0000-000000000000',
     'x6@example.test', 'teacher', 'e3000000-0000-0000-0000-000000000001', repeat('f', 64))$q$,
  'school_suspended');
SELECT rls_test.refused('a bad email is refused',
  $q$SELECT * FROM public.create_school_invitation('e1000000-0000-0000-0000-000000000000',
     'not-an-email', 'teacher', 'e1000000-0000-0000-0000-000000000001', repeat('f', 64))$q$,
  'invalid_email');
SELECT rls_test.refused('an unknown role is refused',
  $q$SELECT * FROM public.create_school_invitation('e1000000-0000-0000-0000-000000000000',
     'x7@example.test', 'platform_admin', 'e1000000-0000-0000-0000-000000000001', repeat('f', 64))$q$,
  'invalid_role');
SELECT rls_test.refused('a bad token hash is refused',
  $q$SELECT * FROM public.create_school_invitation('e1000000-0000-0000-0000-000000000000',
     'x8@example.test', 'teacher', 'e1000000-0000-0000-0000-000000000001', 'not-a-hash')$q$,
  'invalid_token_hash');
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 5. Signed-in users and visitors cannot call it directly (only the server can)
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', json_build_object(
  'sub', 'e1000000-0000-0000-0000-000000000001', 'role', 'authenticated',
  'tenant_id', 'e1000000-0000-0000-0000-000000000000', 'app_roles', json_build_array('school_admin'))::text, true); END $$;
SELECT rls_test.refused('a signed-in School Admin cannot call it from the browser',
  $q$SELECT * FROM public.create_school_invitation('e1000000-0000-0000-0000-000000000000',
     'x9@example.test', 'teacher', 'e1000000-0000-0000-0000-000000000001', repeat('f', 64))$q$,
  'permission denied');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT rls_test.refused('a visitor cannot call it',
  $q$SELECT * FROM public.create_school_invitation('e1000000-0000-0000-0000-000000000000',
     'x9@example.test', 'teacher', 'e1000000-0000-0000-0000-000000000001', repeat('f', 64))$q$,
  'permission denied');
RESET ROLE;

\echo 'All 0019 tests passed. Rolling back.'
ROLLBACK;
