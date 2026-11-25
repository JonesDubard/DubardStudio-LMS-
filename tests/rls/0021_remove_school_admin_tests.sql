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

-- Helpers: a membership's status, how many membership.remove audit rows a school has,
-- and what the login hook puts in a fresh token for a user (same as 0010_platform_tests).
CREATE FUNCTION rls_test.status(profile uuid, r text) RETURNS text LANGUAGE sql AS $$
  SELECT status::text FROM public.memberships WHERE profile_id = profile AND role::text = r $$;
CREATE FUNCTION rls_test.audits(tenant uuid) RETURNS text LANGUAGE sql AS $$
  SELECT count(*)::text FROM public.audit_log WHERE tenant_id = tenant AND action = 'membership.remove' $$;
CREATE FUNCTION rls_test.hook(uid uuid) RETURNS jsonb LANGUAGE sql AS $$
  SELECT public.custom_access_token_hook(jsonb_build_object(
    'user_id', uid, 'claims', jsonb_build_object('sub', uid, 'role', 'authenticated'))) $$;
GRANT EXECUTE ON FUNCTION rls_test.status(uuid, text), rls_test.audits(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Data
--   f7..01 active Platform Admin, f7..02 inactive Platform Admin
--   e1 Remove School: admins A1, A2 (A2 is also a teacher), A3, A4; a teacher T
--   e2 Other School: its only admin B1
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('f7000000-0000-0000-0000-000000000001', 'pa21@test'),
  ('f7000000-0000-0000-0000-000000000002', 'pa21-off@test'),
  ('e1000000-0000-0000-0000-000000000001', 'a1.21@example.test'),
  ('e1000000-0000-0000-0000-000000000002', 'a2.21@example.test'),
  ('e1000000-0000-0000-0000-000000000003', 'a3.21@example.test'),
  ('e1000000-0000-0000-0000-000000000004', 't.21@example.test'),
  ('e1000000-0000-0000-0000-000000000006', 'a4.21@example.test'),
  ('e2000000-0000-0000-0000-000000000001', 'b1.21@example.test');

INSERT INTO public.platform_admins (id, full_name, email, is_active) VALUES
  ('f7000000-0000-0000-0000-000000000001', 'PA 21',     'pa21@test',     true),
  ('f7000000-0000-0000-0000-000000000002', 'PA 21 off', 'pa21-off@test', false);

INSERT INTO public.tenants (id, name, subdomain, subscription_status) VALUES
  ('e1000000-0000-0000-0000-000000000000', 'Remove School', 'remove-school-21', 'active'),
  ('e2000000-0000-0000-0000-000000000000', 'Other School',  'other-school-21',  'active');

INSERT INTO public.profiles (id, tenant_id, full_name, email, status) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000000', 'Admin A1',  'a1.21@example.test', 'active'),
  ('e1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000000', 'Admin A2',  'a2.21@example.test', 'active'),
  ('e1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000000', 'Admin A3',  'a3.21@example.test', 'active'),
  ('e1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000000', 'Teacher T', 't.21@example.test',  'active'),
  ('e1000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000000', 'Admin A4',  'a4.21@example.test', 'active'),
  ('e2000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000000', 'Admin B1',  'b1.21@example.test', 'active');

INSERT INTO public.memberships (tenant_id, profile_id, role, status) VALUES
  ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000001', 'school_admin', 'active'),
  ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000002', 'school_admin', 'active'),
  ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000002', 'teacher',      'active'),
  ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000003', 'school_admin', 'active'),
  ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000004', 'teacher',      'active'),
  ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000006', 'school_admin', 'active'),
  ('e2000000-0000-0000-0000-000000000000', 'e2000000-0000-0000-0000-000000000001', 'school_admin', 'active');

SELECT rls_test.is('before: A3''s token says School Admin of Remove School',
  (rls_test.hook('e1000000-0000-0000-0000-000000000003')->'claims'->>'tenant_id') || '/'
  || (rls_test.hook('e1000000-0000-0000-0000-000000000003')->'claims'->>'app_roles'),
  'e1000000-0000-0000-0000-000000000000/["school_admin"]');

SET LOCAL ROLE service_role;

-- ---------------------------------------------------------------------------
-- 1. A Platform Admin removes a School Admin, and it is audited
-- ---------------------------------------------------------------------------
SELECT rls_test.is('a Platform Admin removes School Admin A3',
  public.remove_school_admin('e1000000-0000-0000-0000-000000000000',
    'e1000000-0000-0000-0000-000000000003', 'f7000000-0000-0000-0000-000000000001')::text,
  'true');
SELECT rls_test.is('A3''s School Admin membership is now removed',
  rls_test.status('e1000000-0000-0000-0000-000000000003', 'school_admin'), 'removed');
SELECT rls_test.is('one audit row: who, which school, which membership, role and email',
  (SELECT a.actor_id || '/' || a.actor_kind || '/' || a.resource_type || '/'
          || (a.resource_id = m.id) || '/' || a.result || '/' || (a.details->>'role') || '/'
          || (a.details->>'profile_id') || '/' || (a.details->>'email')
   FROM public.audit_log a
   JOIN public.memberships m ON m.profile_id = 'e1000000-0000-0000-0000-000000000003' AND m.role = 'school_admin'
   WHERE a.tenant_id = 'e1000000-0000-0000-0000-000000000000' AND a.action = 'membership.remove'),
  'f7000000-0000-0000-0000-000000000001/platform_admin/membership/true/success/school_admin/'
  || 'e1000000-0000-0000-0000-000000000003/a3.21@example.test');
SELECT rls_test.is('the profile itself is kept (lessons, grades and the log still point to it)',
  (SELECT status::text FROM public.profiles WHERE id = 'e1000000-0000-0000-0000-000000000003'), 'active');
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2. The removed person loses access at their next token refresh (US-037.2)
-- ---------------------------------------------------------------------------
SELECT rls_test.is('A3''s next token has no school and no roles (RLS then denies everything)',
  coalesce(rls_test.hook('e1000000-0000-0000-0000-000000000003')->'claims'->>'tenant_id', 'none') || '/'
  || coalesce(rls_test.hook('e1000000-0000-0000-0000-000000000003')->'claims'->>'app_roles', 'none'),
  'none/none');

SET LOCAL ROLE service_role;
SELECT rls_test.is('A2 (School Admin and teacher) is removed as School Admin',
  public.remove_school_admin('e1000000-0000-0000-0000-000000000000',
    'e1000000-0000-0000-0000-000000000002', 'f7000000-0000-0000-0000-000000000001')::text,
  'true');
SELECT rls_test.is('A2 keeps the teacher role: only the School Admin membership changed',
  rls_test.status('e1000000-0000-0000-0000-000000000002', 'school_admin') || '/'
  || rls_test.status('e1000000-0000-0000-0000-000000000002', 'teacher'),
  'removed/active');
RESET ROLE;
SELECT rls_test.is('A2''s next token says teacher only, no school_admin',
  rls_test.hook('e1000000-0000-0000-0000-000000000002')->'claims'->>'app_roles', '["teacher"]');

-- ---------------------------------------------------------------------------
-- 3. A School Admin of the same school can remove another one, also audited
-- ---------------------------------------------------------------------------
SET LOCAL ROLE service_role;
SELECT rls_test.is('School Admin A1 removes School Admin A4 of the same school',
  public.remove_school_admin('e1000000-0000-0000-0000-000000000000',
    'e1000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000001')::text,
  'true');
SELECT rls_test.is('its audit row names A1 as a user (not a Platform Admin)',
  (SELECT actor_id || '/' || actor_kind FROM public.audit_log
   WHERE action = 'membership.remove' AND details->>'profile_id' = 'e1000000-0000-0000-0000-000000000006'),
  'e1000000-0000-0000-0000-000000000001/user');
SELECT rls_test.refused('a removed School Admin (A3) can''t remove anyone',
  $q$SELECT public.remove_school_admin('e1000000-0000-0000-0000-000000000000',
     'e1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000003')$q$,
  'not_allowed');
SELECT rls_test.refused('a teacher can''t remove a School Admin',
  $q$SELECT public.remove_school_admin('e1000000-0000-0000-0000-000000000000',
     'e1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000004')$q$,
  'not_allowed');
SELECT rls_test.refused('another school''s School Admin (B1) can''t remove one here',
  $q$SELECT public.remove_school_admin('e1000000-0000-0000-0000-000000000000',
     'e1000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001')$q$,
  'not_allowed');

-- ---------------------------------------------------------------------------
-- 4. The last School Admin can't be removed; refusals change nothing
-- ---------------------------------------------------------------------------
SELECT rls_test.refused('removing the last active School Admin (A1) is refused',
  $q$SELECT public.remove_school_admin('e1000000-0000-0000-0000-000000000000',
     'e1000000-0000-0000-0000-000000000001', 'f7000000-0000-0000-0000-000000000001')$q$,
  'last_school_admin');
SELECT rls_test.is('A1 is still an active School Admin',
  rls_test.status('e1000000-0000-0000-0000-000000000001', 'school_admin'), 'active');
SELECT rls_test.refused('removing someone already removed is refused with admin_not_found',
  $q$SELECT public.remove_school_admin('e1000000-0000-0000-0000-000000000000',
     'e1000000-0000-0000-0000-000000000003', 'f7000000-0000-0000-0000-000000000001')$q$,
  'admin_not_found');
SELECT rls_test.refused('a teacher (not a School Admin) is refused with admin_not_found',
  $q$SELECT public.remove_school_admin('e1000000-0000-0000-0000-000000000000',
     'e1000000-0000-0000-0000-000000000004', 'f7000000-0000-0000-0000-000000000001')$q$,
  'admin_not_found');

-- ---------------------------------------------------------------------------
-- 5. One school only, and only an allowed actor
-- ---------------------------------------------------------------------------
SELECT rls_test.refused('another school''s School Admin can''t be removed through this school',
  $q$SELECT public.remove_school_admin('e1000000-0000-0000-0000-000000000000',
     'e2000000-0000-0000-0000-000000000001', 'f7000000-0000-0000-0000-000000000001')$q$,
  'admin_not_found');
SELECT rls_test.is('the other school''s admin is untouched',
  rls_test.status('e2000000-0000-0000-0000-000000000001', 'school_admin'), 'active');
SELECT rls_test.refused('an inactive Platform Admin is refused',
  $q$SELECT public.remove_school_admin('e1000000-0000-0000-0000-000000000000',
     'e1000000-0000-0000-0000-000000000001', 'f7000000-0000-0000-0000-000000000002')$q$,
  'not_allowed');
SELECT rls_test.refused('no actor at all is refused',
  $q$SELECT public.remove_school_admin('e1000000-0000-0000-0000-000000000000',
     'e1000000-0000-0000-0000-000000000001', NULL)$q$,
  'not_allowed');
SELECT rls_test.is('three removals, three audit rows; the refusals left nothing',
  rls_test.audits('e1000000-0000-0000-0000-000000000000') || '/'
  || rls_test.audits('e2000000-0000-0000-0000-000000000000'),
  '3/0');
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 6. A signed-in School Admin can't change School Admin memberships directly any more
--    (only through remove_school_admin, which audits), but can still manage other roles
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES ('e1000000-0000-0000-0000-000000000005', 'new.21@example.test');
INSERT INTO public.profiles (id, tenant_id, full_name, email, status) VALUES
  ('e1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000000', 'New 21', 'new.21@example.test', 'active');

SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', json_build_object(
  'sub', 'e1000000-0000-0000-0000-000000000001', 'role', 'authenticated',
  'tenant_id', 'e1000000-0000-0000-0000-000000000000', 'app_roles', json_build_array('school_admin'))::text, true); END $$;
-- (A1 is the last active admin, so the 0005 guard would refuse changes to A1 first.
--  These use A3's removed membership, so only the new 0021 rule decides.)
SELECT rls_test.refused('a School Admin can''t bring back a removed School Admin',
  $q$UPDATE public.memberships SET status = 'active'
     WHERE profile_id = 'e1000000-0000-0000-0000-000000000003' AND role = 'school_admin'$q$,
  'server_only');
SELECT rls_test.refused('a School Admin can''t delete a School Admin membership',
  $q$DELETE FROM public.memberships
     WHERE profile_id = 'e1000000-0000-0000-0000-000000000003' AND role = 'school_admin'$q$,
  'server_only');
SELECT rls_test.refused('a School Admin can''t make someone a School Admin',
  $q$INSERT INTO public.memberships (tenant_id, profile_id, role)
     VALUES ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000005', 'school_admin')$q$,
  'server_only');
SELECT rls_test.refused('a School Admin can''t turn a teacher membership into School Admin',
  $q$UPDATE public.memberships SET role = 'school_admin'
     WHERE profile_id = 'e1000000-0000-0000-0000-000000000004' AND role = 'teacher'$q$,
  'server_only');
SELECT rls_test.refused('a signed-in School Admin can''t call remove_school_admin',
  $q$SELECT public.remove_school_admin('e1000000-0000-0000-0000-000000000000',
     'e1000000-0000-0000-0000-000000000001', 'f7000000-0000-0000-0000-000000000001')$q$,
  'permission denied');
-- Other roles still work as before (RLS memberships_admin_all).
UPDATE public.memberships SET status = 'suspended'
WHERE profile_id = 'e1000000-0000-0000-0000-000000000004' AND role = 'teacher';
RESET ROLE;
SELECT rls_test.is('a School Admin can still change a teacher membership',
  rls_test.status('e1000000-0000-0000-0000-000000000004', 'teacher'), 'suspended');

SET LOCAL ROLE anon;
SELECT rls_test.refused('a visitor can''t call remove_school_admin',
  $q$SELECT public.remove_school_admin('e1000000-0000-0000-0000-000000000000',
     'e1000000-0000-0000-0000-000000000001', 'f7000000-0000-0000-0000-000000000001')$q$,
  'permission denied');
RESET ROLE;

\echo 'All 0021 tests passed. Rolling back.'
ROLLBACK;
