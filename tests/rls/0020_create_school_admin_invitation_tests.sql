-- Tests for 0020 (US-036): a Platform Admin invites a School Admin, create only, with an audit row.
-- Run on a database with 0001-0020 applied; everything is rolled back at the end.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f tests/rls/0020_create_school_admin_invitation_tests.sql
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

-- Helpers: a fake token hash made of one repeated character, "how many School Admin
-- invitations", and "how many invite.create audit rows" in a school.
CREATE FUNCTION rls_test.h(c char) RETURNS text LANGUAGE sql AS $$ SELECT repeat(c::text, 64) $$;
CREATE FUNCTION rls_test.n(tenant uuid) RETURNS text LANGUAGE sql AS $$
  SELECT count(*)::text FROM public.invitations WHERE tenant_id = tenant AND role = 'school_admin' $$;
CREATE FUNCTION rls_test.audits(tenant uuid) RETURNS text LANGUAGE sql AS $$
  SELECT count(*)::text FROM public.audit_log WHERE tenant_id = tenant AND action = 'invite.create' $$;
GRANT EXECUTE ON FUNCTION rls_test.h(char), rls_test.n(uuid), rls_test.audits(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Data
--   f6..01 active Platform Admin, f6..02 inactive Platform Admin
--   e1 Admin School (active): its School Admin, a teacher
--   e2 Other School (active): its own School Admin
--   e3 Frozen School (suspended)
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('f6000000-0000-0000-0000-000000000001', 'pa20@test'),
  ('f6000000-0000-0000-0000-000000000002', 'pa20-off@test'),
  ('e1000000-0000-0000-0000-000000000001', 'admin20@test'),
  ('e1000000-0000-0000-0000-000000000003', 'teacher20@example.test'),
  ('e2000000-0000-0000-0000-000000000001', 'other20@test'),
  ('e1000000-0000-0000-0000-000000000009', 'second.admin@example.test');

INSERT INTO public.platform_admins (id, full_name, email, is_active) VALUES
  ('f6000000-0000-0000-0000-000000000001', 'PA 20',     'pa20@test',     true),
  ('f6000000-0000-0000-0000-000000000002', 'PA 20 off', 'pa20-off@test', false);

INSERT INTO public.tenants (id, name, subdomain, subscription_status) VALUES
  ('e1000000-0000-0000-0000-000000000000', 'Admin School',  'admin-school-20',  'active'),
  ('e2000000-0000-0000-0000-000000000000', 'Other School',  'other-school-20',  'active'),
  ('e3000000-0000-0000-0000-000000000000', 'Frozen School', 'frozen-school-20', 'suspended');

INSERT INTO public.profiles (id, tenant_id, full_name, email, status) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000000', 'Admin 20',   'Admin20@Example.Test', 'active'),
  ('e1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000000', 'Teacher 20', 'teacher20@example.test',       'active'),
  ('e2000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000000', 'Other 20',   'other20@test',         'active');

INSERT INTO public.memberships (tenant_id, profile_id, role, status) VALUES
  ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000001', 'school_admin', 'active'),
  ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000003', 'teacher',      'active'),
  ('e2000000-0000-0000-0000-000000000000', 'e2000000-0000-0000-0000-000000000001', 'school_admin', 'active');

SET LOCAL ROLE service_role;

-- ---------------------------------------------------------------------------
-- 1. A Platform Admin can invite a School Admin, and it is audited
-- ---------------------------------------------------------------------------
SELECT rls_test.is('a Platform Admin invites a School Admin: one new invitation, not a reuse',
  (SELECT reused::text FROM public.create_school_admin_invitation(
     'e1000000-0000-0000-0000-000000000000', '  Second.Admin@Example.test ',
     'f6000000-0000-0000-0000-000000000001', public.invitation_token_hash('us036-test-token-0000000001'))),
  'false');
SELECT rls_test.is('exactly one School Admin invitation in the school',
  rls_test.n('e1000000-0000-0000-0000-000000000000'), '1');
SELECT rls_test.is('it is pending, unsent, role school_admin, lowercase email, 7 days, no profile as inviter',
  (SELECT status || '/' || (sent_at IS NULL) || '/' || role || '/' || email || '/'
          || (expires_at > now() + interval '6 days 23 hours') || '/' || (invited_by IS NULL)
   FROM public.invitations WHERE tenant_id = 'e1000000-0000-0000-0000-000000000000'),
  'pending/true/school_admin/second.admin@example.test/true/true');
SELECT rls_test.is('one audit row: who, which school, which invitation, role and email',
  (SELECT a.actor_id || '/' || a.actor_kind || '/' || a.resource_type || '/'
          || (a.resource_id = i.id) || '/' || a.result || '/' || (a.details->>'role') || '/' || (a.details->>'email')
   FROM public.audit_log a
   JOIN public.invitations i ON i.tenant_id = a.tenant_id
   WHERE a.tenant_id = 'e1000000-0000-0000-0000-000000000000' AND a.action = 'invite.create'),
  'f6000000-0000-0000-0000-000000000001/platform_admin/invitation/true/success/school_admin/second.admin@example.test');
SELECT rls_test.is('the other school got no invitation and no audit row',
  rls_test.n('e2000000-0000-0000-0000-000000000000') || '/' || rls_test.audits('e2000000-0000-0000-0000-000000000000'),
  '0/0');

-- A school can have several School Admins: a second, different email is fine.
SELECT rls_test.is('a second School Admin invite (another email) for the same school works',
  (SELECT reused::text FROM public.create_school_admin_invitation(
     'e1000000-0000-0000-0000-000000000000', 'third.admin@example.test',
     'f6000000-0000-0000-0000-000000000001', rls_test.h('b'))),
  'false');
SELECT rls_test.is('two invitations and two audit rows now',
  rls_test.n('e1000000-0000-0000-0000-000000000000') || '/' || rls_test.audits('e1000000-0000-0000-0000-000000000000'),
  '2/2');

-- ---------------------------------------------------------------------------
-- 2. No duplicates: refused, nothing changes, no audit row
-- ---------------------------------------------------------------------------
SELECT rls_test.refused('the same email again is refused with already_invited',
  $q$SELECT * FROM public.create_school_admin_invitation('e1000000-0000-0000-0000-000000000000',
     'SECOND.ADMIN@example.test', 'f6000000-0000-0000-0000-000000000001', repeat('c', 64))$q$,
  'already_invited');
SELECT rls_test.is('the first link was not replaced',
  (SELECT (token_hash = public.invitation_token_hash('us036-test-token-0000000001'))::text
   FROM public.invitations WHERE email = 'second.admin@example.test'), 'true');
SELECT rls_test.refused('an existing School Admin of this school is refused with already_member',
  $q$SELECT * FROM public.create_school_admin_invitation('e1000000-0000-0000-0000-000000000000',
     'admin20@example.test', 'f6000000-0000-0000-0000-000000000001', repeat('d', 64))$q$,
  'already_member');
SELECT rls_test.is('a teacher here CAN be invited as School Admin (a different role)',
  (SELECT reused::text FROM public.create_school_admin_invitation(
     'e1000000-0000-0000-0000-000000000000', 'teacher20@example.test',
     'f6000000-0000-0000-0000-000000000001', rls_test.h('e'))),
  'false');
SELECT rls_test.is('three invitations and three audit rows (the refusals left nothing)',
  rls_test.n('e1000000-0000-0000-0000-000000000000') || '/' || rls_test.audits('e1000000-0000-0000-0000-000000000000'),
  '3/3');

-- ---------------------------------------------------------------------------
-- 3. Only an active Platform Admin
-- ---------------------------------------------------------------------------
SELECT rls_test.refused('an inactive Platform Admin is refused',
  $q$SELECT * FROM public.create_school_admin_invitation('e1000000-0000-0000-0000-000000000000',
     'x1@example.test', 'f6000000-0000-0000-0000-000000000002', repeat('f', 64))$q$,
  'not_platform_admin');
SELECT rls_test.refused('a School Admin (not a Platform Admin) is refused',
  $q$SELECT * FROM public.create_school_admin_invitation('e1000000-0000-0000-0000-000000000000',
     'x2@example.test', 'e1000000-0000-0000-0000-000000000001', repeat('f', 64))$q$,
  'not_platform_admin');
SELECT rls_test.refused('no actor at all is refused',
  $q$SELECT * FROM public.create_school_admin_invitation('e1000000-0000-0000-0000-000000000000',
     'x3@example.test', NULL, repeat('f', 64))$q$,
  'not_platform_admin');

-- ---------------------------------------------------------------------------
-- 4. A School Admin can't invite another School Admin through 0019 any more
-- ---------------------------------------------------------------------------
SELECT rls_test.refused('create_school_invitation refuses role school_admin',
  $q$SELECT * FROM public.create_school_invitation('e1000000-0000-0000-0000-000000000000',
     'x4@example.test', 'school_admin', 'e1000000-0000-0000-0000-000000000001', repeat('f', 64))$q$,
  'platform_admin_only');
SELECT rls_test.is('create_school_invitation still works for a teacher',
  (SELECT reused::text FROM public.create_school_invitation(
     'e1000000-0000-0000-0000-000000000000', 'new.teacher20@example.test', 'teacher',
     'e1000000-0000-0000-0000-000000000001', rls_test.h('7'))),
  'false');
SELECT rls_test.is('none of the refused calls made a School Admin invitation or an audit row',
  rls_test.n('e1000000-0000-0000-0000-000000000000') || '/' || rls_test.audits('e1000000-0000-0000-0000-000000000000'),
  '3/3');

-- ---------------------------------------------------------------------------
-- 5. A suspended or unknown school, and bad input
-- ---------------------------------------------------------------------------
SELECT rls_test.refused('a suspended school is refused',
  $q$SELECT * FROM public.create_school_admin_invitation('e3000000-0000-0000-0000-000000000000',
     'x5@example.test', 'f6000000-0000-0000-0000-000000000001', repeat('f', 64))$q$,
  'school_suspended');
SELECT rls_test.refused('an unknown school is refused',
  $q$SELECT * FROM public.create_school_admin_invitation('e9000000-0000-0000-0000-000000000000',
     'x6@example.test', 'f6000000-0000-0000-0000-000000000001', repeat('f', 64))$q$,
  'school_not_found');
SELECT rls_test.refused('a bad email is refused',
  $q$SELECT * FROM public.create_school_admin_invitation('e1000000-0000-0000-0000-000000000000',
     'not-an-email', 'f6000000-0000-0000-0000-000000000001', repeat('f', 64))$q$,
  'invalid_email');
SELECT rls_test.refused('a bad token hash is refused',
  $q$SELECT * FROM public.create_school_admin_invitation('e1000000-0000-0000-0000-000000000000',
     'x7@example.test', 'f6000000-0000-0000-0000-000000000001', 'not-a-hash')$q$,
  'invalid_token_hash');

-- ---------------------------------------------------------------------------
-- 6. The invite works for that school only (US-036 acceptance)
-- ---------------------------------------------------------------------------
-- Someone from another school can't use it with their account.
SELECT rls_test.refused('another school''s account cannot accept it',
  $q$SELECT * FROM public.accept_invitation('us036-test-token-0000000001',
     'e2000000-0000-0000-0000-000000000001', 'Other 20')$q$,
  'wrong_school');
-- The invited person (a new account) accepts and becomes School Admin of Admin School only.
SELECT rls_test.is('the invited person accepts: School Admin of this school',
  (SELECT tenant_id || '/' || role FROM public.accept_invitation('us036-test-token-0000000001',
     'e1000000-0000-0000-0000-000000000009', 'Second Admin')),
  'e1000000-0000-0000-0000-000000000000/school_admin');
SELECT rls_test.is('they have exactly one membership: School Admin of Admin School',
  (SELECT string_agg(tenant_id || ':' || role || ':' || status, ',') FROM public.memberships
   WHERE profile_id = 'e1000000-0000-0000-0000-000000000009'),
  'e1000000-0000-0000-0000-000000000000:school_admin:active');
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 7. Signed-in users and visitors cannot call it directly (only the server can)
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', json_build_object(
  'sub', 'e1000000-0000-0000-0000-000000000001', 'role', 'authenticated',
  'tenant_id', 'e1000000-0000-0000-0000-000000000000', 'app_roles', json_build_array('school_admin'))::text, true); END $$;
SELECT rls_test.refused('a signed-in School Admin cannot call it from the browser',
  $q$SELECT * FROM public.create_school_admin_invitation('e1000000-0000-0000-0000-000000000000',
     'x8@example.test', 'f6000000-0000-0000-0000-000000000001', repeat('f', 64))$q$,
  'permission denied');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT rls_test.refused('a visitor cannot call it',
  $q$SELECT * FROM public.create_school_admin_invitation('e1000000-0000-0000-0000-000000000000',
     'x8@example.test', 'f6000000-0000-0000-0000-000000000001', repeat('f', 64))$q$,
  'permission denied');
RESET ROLE;

\echo 'All 0020 tests passed. Rolling back.'
ROLLBACK;
