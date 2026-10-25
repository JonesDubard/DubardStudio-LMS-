-- Tests for 0010. Run on a database with 0001-0010 applied. Everything runs in
-- one transaction and is rolled back at the end.
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f 0010_tests.sql
-- Each check prints "ok - ..."; the first failure stops the script with "FAIL - ...".

\pset tuples_only on
\pset format unaligned

BEGIN;

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

-- The statement must fail, and its error must contain want_text.
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

-- What the login hook returns for a user.
CREATE FUNCTION rls_test.hook(uid uuid) RETURNS jsonb
LANGUAGE sql AS $$
  SELECT public.custom_access_token_hook(jsonb_build_object(
    'user_id', uid, 'claims', jsonb_build_object('sub', uid, 'role', 'authenticated')))
$$;

-- The same, but the incoming claims already carry an old tenant_id and app_roles.
CREATE FUNCTION rls_test.hook_stale(uid uuid) RETURNS jsonb
LANGUAGE sql AS $$
  SELECT public.custom_access_token_hook(jsonb_build_object(
    'user_id', uid, 'claims', jsonb_build_object('sub', uid, 'role', 'authenticated',
      'tenant_id', 'c2000000-0000-0000-0000-000000000000', 'app_roles', '["school_admin"]'::jsonb)))
$$;

GRANT USAGE ON SCHEMA rls_test TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rls_test TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Data: a Platform Admin (active), one inactive, and one school per status
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, email) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'pa@test'),
  ('f0000000-0000-0000-0000-000000000002', 'pa-off@test'),
  ('c1000000-0000-0000-0000-000000000001', 'trial-teacher@test'),
  ('c2000000-0000-0000-0000-000000000001', 'active-teacher@test'),
  ('c3000000-0000-0000-0000-000000000001', 'suspended-teacher@test'),
  ('c4000000-0000-0000-0000-000000000001', 'cancelled-teacher@test');

INSERT INTO public.platform_admins (id, full_name, email, is_active) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'PA', 'pa@test', true),
  ('f0000000-0000-0000-0000-000000000002', 'PA off', 'pa-off@test', false);

INSERT INTO public.tenants (id, name, subdomain, subscription_status, logo_url) VALUES
  ('c1000000-0000-0000-0000-000000000000', 'Trial School', 'trial-school', 'trial', 'https://logo/t.png'),
  ('c2000000-0000-0000-0000-000000000000', 'Active School', 'active-school', 'active', NULL),
  ('c3000000-0000-0000-0000-000000000000', 'Suspended School', 'suspended-school', 'suspended', NULL),
  ('c4000000-0000-0000-0000-000000000000', 'Cancelled School', 'cancelled-school', 'cancelled', NULL);

INSERT INTO public.profiles (id, tenant_id, full_name, email)
SELECT u.id, (substr(u.id::text, 1, 2) || '000000-0000-0000-0000-000000000000')::uuid, u.email, u.email
FROM auth.users u WHERE u.id::text LIKE 'c%';

INSERT INTO public.memberships (tenant_id, profile_id, role)
SELECT tenant_id, id, 'teacher' FROM public.profiles WHERE id::text LIKE 'c%';

-- ---------------------------------------------------------------------------
-- get_branding: public, before sign-in
-- ---------------------------------------------------------------------------

SET LOCAL ROLE anon;
SELECT rls_test.is('anon gets a school''s branding by subdomain',
  (SELECT name || ' ' || logo_url FROM public.get_branding('trial-school')), 'Trial School https://logo/t.png');
SELECT rls_test.is('subdomain lookup ignores case and spaces',
  (SELECT name FROM public.get_branding('  Trial-School ')), 'Trial School');
SELECT rls_test.eq('unknown subdomain returns nothing',
  (SELECT count(*) FROM public.get_branding('no-such-school')), 0);
SELECT rls_test.eq('suspended school still returns branding (login page shows it)',
  (SELECT count(*) FROM public.get_branding('suspended-school')), 1);
SELECT rls_test.refused('anon cannot read tenants directly',
  $$SELECT count(*) FROM public.tenants$$, 'permission denied');
SELECT rls_test.refused('anon cannot call provision_tenant',
  $$SELECT public.provision_tenant('X', 'x-school', 'C', 'c@x.org', 'f0000000-0000-0000-0000-000000000001')$$,
  'permission denied');
SELECT rls_test.refused('anon cannot read audit_log', $$SELECT count(*) FROM public.audit_log$$, 'permission denied');
RESET ROLE;

-- ---------------------------------------------------------------------------
-- Login hook
-- ---------------------------------------------------------------------------

SELECT rls_test.is('trial school: token carries tenant_id',
  rls_test.hook('c1000000-0000-0000-0000-000000000001') #>> '{claims,tenant_id}', 'c1000000-0000-0000-0000-000000000000');
SELECT rls_test.is('active school: token carries app_roles',
  rls_test.hook('c2000000-0000-0000-0000-000000000001') #>> '{claims,app_roles}', '["teacher"]');
SELECT rls_test.is('suspended school: login refused with school_suspended',
  rls_test.hook('c3000000-0000-0000-0000-000000000001') #>> '{error,message}', 'school_suspended');
SELECT rls_test.is('cancelled school: login refused with school_cancelled',
  rls_test.hook('c4000000-0000-0000-0000-000000000001') #>> '{error,message}', 'school_cancelled');
SELECT rls_test.is('refusal uses HTTP 403',
  rls_test.hook('c3000000-0000-0000-0000-000000000001') #>> '{error,http_code}', '403');
SELECT rls_test.is('active Platform Admin gets platform_admin',
  rls_test.hook('f0000000-0000-0000-0000-000000000001') #>> '{claims,app_roles}', '["platform_admin"]');
SELECT rls_test.is('inactive Platform Admin refused',
  rls_test.hook('f0000000-0000-0000-0000-000000000002') #>> '{error,message}', 'platform_admin_inactive');

SELECT rls_test.is('user with no membership: old tenant_id and app_roles are removed',
  ((rls_test.hook_stale('d0000000-0000-0000-0000-000000000001') -> 'claims') ?| ARRAY['tenant_id', 'app_roles'])::text, 'false');
SELECT rls_test.is('Platform Admin: an old tenant_id is removed',
  ((rls_test.hook_stale('f0000000-0000-0000-0000-000000000001') -> 'claims') ? 'tenant_id')::text, 'false');
SELECT rls_test.is('Platform Admin: app_roles is replaced, not merged',
  rls_test.hook_stale('f0000000-0000-0000-0000-000000000001') #>> '{claims,app_roles}', '["platform_admin"]');
SELECT rls_test.is('member: an old tenant_id is replaced by the real one',
  rls_test.hook_stale('c1000000-0000-0000-0000-000000000001') #>> '{claims,tenant_id}', 'c1000000-0000-0000-0000-000000000000');
SELECT rls_test.is('hook has a fixed search_path',
  (SELECT array_to_string(proconfig, ',') FROM pg_proc WHERE oid = 'public.custom_access_token_hook(jsonb)'::regprocedure),
  'search_path=""');

UPDATE public.tenants SET subscription_status = 'active' WHERE id = 'c3000000-0000-0000-0000-000000000000';
SELECT rls_test.is('reactivated school: login works again straight away',
  rls_test.hook('c3000000-0000-0000-0000-000000000001') #>> '{claims,tenant_id}', 'c3000000-0000-0000-0000-000000000000');

-- ---------------------------------------------------------------------------
-- provision_tenant (as the service role, like the Edge Function)
-- ---------------------------------------------------------------------------

SET LOCAL ROLE service_role;

SELECT rls_test.refused('bad subdomain refused (uppercase/space)',
  $$SELECT public.provision_tenant('X', 'My School', 'C', 'c@x.org', 'f0000000-0000-0000-0000-000000000001')$$, 'invalid_subdomain');
SELECT rls_test.refused('too-short subdomain refused',
  $$SELECT public.provision_tenant('X', 'ab', 'C', 'c@x.org', 'f0000000-0000-0000-0000-000000000001')$$, 'invalid_subdomain');
SELECT rls_test.refused('31-character subdomain refused',
  $$SELECT public.provision_tenant('X', repeat('a', 31), 'C', 'c@x.org', 'f0000000-0000-0000-0000-000000000001')$$, 'invalid_subdomain');
SELECT rls_test.refused('hyphen at the start refused',
  $$SELECT public.provision_tenant('X', '-abc', 'C', 'c@x.org', 'f0000000-0000-0000-0000-000000000001')$$, 'invalid_subdomain');
SELECT rls_test.refused('reserved subdomain refused',
  $$SELECT public.provision_tenant('X', 'admin', 'C', 'c@x.org', 'f0000000-0000-0000-0000-000000000001')$$, 'reserved_subdomain');
SELECT rls_test.refused('duplicate subdomain refused',
  $$SELECT public.provision_tenant('X', 'trial-school', 'C', 'c@x.org', 'f0000000-0000-0000-0000-000000000001')$$, 'subdomain_taken');
SELECT rls_test.refused('bad contact email refused',
  $$SELECT public.provision_tenant('X', 'new-school', 'C', 'not-an-email', 'f0000000-0000-0000-0000-000000000001')$$, 'invalid_contact');
SELECT rls_test.refused('NULL subdomain refused',
  $$SELECT public.provision_tenant('X', NULL, 'C', 'c@x.org', 'f0000000-0000-0000-0000-000000000001')$$, 'invalid_subdomain');
SELECT rls_test.refused('NULL contact email refused',
  $$SELECT public.provision_tenant('X', 'new-school', 'C', NULL, 'f0000000-0000-0000-0000-000000000001')$$, 'invalid_contact');
SELECT rls_test.refused('NULL name refused',
  $$SELECT public.provision_tenant(NULL, 'new-school', 'C', 'c@x.org', 'f0000000-0000-0000-0000-000000000001')$$, 'invalid_name');
SELECT rls_test.refused('NULL actor refused',
  $$SELECT public.provision_tenant('X', 'new-school', 'C', 'c@x.org', NULL)$$, 'not_platform_admin');
SELECT rls_test.refused('inactive Platform Admin cannot create a school',
  $$SELECT public.provision_tenant('X', 'new-school', 'C', 'c@x.org', 'f0000000-0000-0000-0000-000000000002')$$, 'not_platform_admin');
SELECT rls_test.refused('a teacher id cannot create a school',
  $$SELECT public.provision_tenant('X', 'new-school', 'C', 'c@x.org', 'c1000000-0000-0000-0000-000000000001')$$, 'not_platform_admin');
SELECT rls_test.eq('refused calls left no school and no audit row',
  (SELECT count(*) FROM public.tenants WHERE subdomain = 'new-school')
  + (SELECT count(*) FROM public.audit_log WHERE details ->> 'subdomain' = 'new-school'), 0);

SELECT public.provision_tenant('  New School ', 'New-School', 'Ama K.', 'Ama@NewSchool.org',
  'f0000000-0000-0000-0000-000000000001');
SELECT rls_test.is('school created with trimmed name, lowercase subdomain, trial, provisioning',
  (SELECT name || '|' || subdomain || '|' || subscription_status || '|' || onboarding_status || '|' || contact_email
   FROM public.tenants WHERE subdomain = 'new-school'),
  'New School|new-school|trial|provisioning|ama@newschool.org');
SELECT rls_test.is('default colours set',
  (SELECT primary_color || ' ' || secondary_color FROM public.tenants WHERE subdomain = 'new-school'), '#1F3A5F #F2A900');
SELECT rls_test.eq('no classes or subjects yet',
  (SELECT count(*) FROM public.classes c JOIN public.tenants t ON t.id = c.tenant_id WHERE t.subdomain = 'new-school')
  + (SELECT count(*) FROM public.subjects s JOIN public.tenants t ON t.id = s.tenant_id WHERE t.subdomain = 'new-school'), 0);
SELECT rls_test.eq('exactly one audit row, by the Platform Admin, for the new school',
  (SELECT count(*) FROM public.audit_log a JOIN public.tenants t ON t.id = a.tenant_id
   WHERE t.subdomain = 'new-school' AND a.action = 'tenant.create'
     AND a.actor_id = 'f0000000-0000-0000-0000-000000000001' AND a.actor_kind = 'platform_admin'), 1);
SELECT rls_test.refused('running it again creates nothing twice',
  $$SELECT public.provision_tenant('New School', 'new-school', 'Ama K.', 'ama@newschool.org', 'f0000000-0000-0000-0000-000000000001')$$,
  'subdomain_taken');
SELECT rls_test.eq('still one school and one audit row',
  (SELECT count(*) FROM public.tenants WHERE subdomain = 'new-school')
  + (SELECT count(*) FROM public.audit_log WHERE details ->> 'subdomain' = 'new-school'), 2);

-- ---------------------------------------------------------------------------
-- audit_log is append-only for everyone
-- ---------------------------------------------------------------------------

-- The service role has no UPDATE/DELETE grant, so it's stopped by permissions.
-- The owner has every privilege, so the owner tests below prove the trigger.
SELECT rls_test.refused('service role cannot update audit_log', $$UPDATE public.audit_log SET reason = 'x'$$, 'permission denied');
SELECT rls_test.refused('service role cannot delete from audit_log', $$DELETE FROM public.audit_log$$, 'permission denied');
SELECT rls_test.refused('service role cannot truncate audit_log', $$TRUNCATE public.audit_log$$, 'permission denied');
RESET ROLE;
SELECT rls_test.refused('even the database owner cannot update audit_log',
  $$UPDATE public.audit_log SET reason = 'x'$$, 'append-only');
SELECT rls_test.refused('even the database owner cannot delete from audit_log',
  $$DELETE FROM public.audit_log$$, 'append-only');
SELECT rls_test.refused('even the database owner cannot truncate audit_log',
  $$TRUNCATE public.audit_log$$, 'append-only');
SELECT rls_test.refused('subdomain rule also holds for direct inserts',
  $$INSERT INTO public.tenants (name, subdomain) VALUES ('X', 'Bad Name')$$, 'tenants_subdomain_format');

-- A signed-in School Admin still can't read the audit log or call provision_tenant.
SELECT set_config('request.jwt.claims',
  (rls_test.hook('c2000000-0000-0000-0000-000000000001') -> 'claims')::text, true);
SET LOCAL ROLE authenticated;
SELECT rls_test.refused('signed-in user cannot read audit_log', $$SELECT count(*) FROM public.audit_log$$, 'permission denied');
SELECT rls_test.refused('signed-in user cannot call provision_tenant',
  $$SELECT public.provision_tenant('X', 'x-school', 'C', 'c@x.org', 'f0000000-0000-0000-0000-000000000001')$$, 'permission denied');
SELECT rls_test.eq('signed-in user can call get_branding', (SELECT count(*) FROM public.get_branding('active-school')), 1);
RESET ROLE;

\echo 'All 0010 tests passed. Rolling back.'
ROLLBACK;
