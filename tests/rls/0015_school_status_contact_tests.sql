-- Tests for 0015 (US-012). Run on a database with 0001-0015 applied. Everything
-- runs in one transaction and is rolled back at the end.
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f tests/rls/0015_school_status_contact_tests.sql
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

-- One checksum over every row of one school: the school's own tenants row
-- (minus subscription_status) plus every row of every public table that has a
-- tenant_id column. Same school data in, same checksum out (US-012.6).
CREATE FUNCTION rls_test.school_checksum(p_tenant uuid) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  r record;
  part text;
  acc text := '';
BEGIN
  SELECT md5((to_jsonb(t) - 'subscription_status')::text) INTO acc
  FROM public.tenants t WHERE t.id = p_tenant;
  FOR r IN
    SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND tb.table_type = 'BASE TABLE'
      AND c.table_name <> 'audit_log'
    ORDER BY c.table_name
  LOOP
    EXECUTE format(
      'SELECT %L || '':'' || count(*) || '':'' || coalesce(md5(string_agg(to_jsonb(x)::text, '','' ORDER BY to_jsonb(x)::text)), '''')
       FROM public.%I x WHERE x.tenant_id = $1', r.table_name, r.table_name)
    INTO part USING p_tenant;
    acc := acc || '|' || part;
  END LOOP;
  RETURN md5(acc);
END $$;

-- How many rows of school data the checksum covers (so the test proves it isn't empty).
CREATE FUNCTION rls_test.school_rows(p_tenant uuid) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE
  r record;
  n bigint;
  total bigint := 0;
BEGIN
  FOR r IN
    SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND tb.table_type = 'BASE TABLE'
      AND c.table_name <> 'audit_log'
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id = $1', r.table_name) INTO n USING p_tenant;
    total := total + n;
  END LOOP;
  RETURN total;
END $$;

GRANT USAGE ON SCHEMA rls_test TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rls_test TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Data: an active and an inactive Platform Admin, one school with people and
-- academic data, and a second school that must never change.
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, email) VALUES
  ('f5000000-0000-0000-0000-000000000001', 'pa15@test'),
  ('f5000000-0000-0000-0000-000000000002', 'pa15-off@test'),
  ('e1000000-0000-0000-0000-000000000001', 'teacher15@test'),
  ('e1000000-0000-0000-0000-000000000002', 'admin15@test'),
  ('e2000000-0000-0000-0000-000000000001', 'other15@test');

INSERT INTO public.platform_admins (id, full_name, email, is_active) VALUES
  ('f5000000-0000-0000-0000-000000000001', 'PA', 'pa15@test', true),
  ('f5000000-0000-0000-0000-000000000002', 'PA off', 'pa15-off@test', false);

INSERT INTO public.tenants (id, name, subdomain, subscription_status, contact_name, contact_email) VALUES
  ('e1000000-0000-0000-0000-000000000000', 'Status School', 'status-school', 'active', 'Old Contact', 'old@school.org'),
  ('e2000000-0000-0000-0000-000000000000', 'Other School',  'other-school',  'active', 'Other', 'other@school.org');

INSERT INTO public.profiles (id, tenant_id, full_name, email) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000000', 'Teacher 15', 'teacher15@test'),
  ('e1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000000', 'Admin 15',   'admin15@test'),
  ('e2000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000000', 'Other 15',   'other15@test');

INSERT INTO public.memberships (tenant_id, profile_id, role) VALUES
  ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000001', 'teacher'),
  ('e1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000002', 'school_admin'),
  ('e2000000-0000-0000-0000-000000000000', 'e2000000-0000-0000-0000-000000000001', 'teacher');

INSERT INTO public.subjects (tenant_id, name)
VALUES ('e1000000-0000-0000-0000-000000000000', 'Maths'), ('e1000000-0000-0000-0000-000000000000', 'English');

CREATE TEMP TABLE before_state AS
SELECT rls_test.school_checksum('e1000000-0000-0000-0000-000000000000') AS school,
       rls_test.school_checksum('e2000000-0000-0000-0000-000000000000') AS other;
GRANT SELECT ON before_state TO service_role;

SELECT rls_test.is('the school has data to protect (at least 5 rows)',
  (rls_test.school_rows('e1000000-0000-0000-0000-000000000000') >= 5)::text, 'true');

-- ---------------------------------------------------------------------------
-- Who may call the functions
-- ---------------------------------------------------------------------------

SET LOCAL ROLE anon;
SELECT rls_test.refused('anon cannot call set_school_status',
  $$SELECT public.set_school_status('e1000000-0000-0000-0000-000000000000', 'suspended', 'f5000000-0000-0000-0000-000000000001')$$,
  'permission denied');
SELECT rls_test.refused('anon cannot call update_school_contact',
  $$SELECT public.update_school_contact('e1000000-0000-0000-0000-000000000000', 'X', 'x@x.org', 'f5000000-0000-0000-0000-000000000001')$$,
  'permission denied');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT rls_test.refused('a signed-in user cannot call set_school_status',
  $$SELECT public.set_school_status('e1000000-0000-0000-0000-000000000000', 'suspended', 'f5000000-0000-0000-0000-000000000001')$$,
  'permission denied');
SELECT rls_test.refused('a signed-in user cannot call update_school_contact',
  $$SELECT public.update_school_contact('e1000000-0000-0000-0000-000000000000', 'X', 'x@x.org', 'f5000000-0000-0000-0000-000000000001')$$,
  'permission denied');
-- US-012.5: School Admins can't edit the contact (or the status) directly either.
SELECT rls_test.refused('a School Admin cannot update the contact email directly',
  $$UPDATE public.tenants SET contact_email = 'me@evil.org' WHERE id = 'e1000000-0000-0000-0000-000000000000'$$,
  'permission denied');
SELECT rls_test.refused('a School Admin cannot update the status directly',
  $$UPDATE public.tenants SET subscription_status = 'active' WHERE id = 'e1000000-0000-0000-0000-000000000000'$$,
  'permission denied');
RESET ROLE;

-- ---------------------------------------------------------------------------
-- set_school_status, as the service role (what the server action uses)
-- ---------------------------------------------------------------------------

SET LOCAL ROLE service_role;

SELECT rls_test.refused('a user who is not a Platform Admin is refused',
  $$SELECT public.set_school_status('e1000000-0000-0000-0000-000000000000', 'suspended', 'e1000000-0000-0000-0000-000000000002')$$,
  'not_platform_admin');
SELECT rls_test.refused('an inactive Platform Admin is refused',
  $$SELECT public.set_school_status('e1000000-0000-0000-0000-000000000000', 'suspended', 'f5000000-0000-0000-0000-000000000002')$$,
  'not_platform_admin');
SELECT rls_test.refused('no actor is refused',
  $$SELECT public.set_school_status('e1000000-0000-0000-0000-000000000000', 'suspended', NULL)$$,
  'not_platform_admin');
SELECT rls_test.refused('an unknown status is refused',
  $$SELECT public.set_school_status('e1000000-0000-0000-0000-000000000000', 'paused', 'f5000000-0000-0000-0000-000000000001')$$,
  'invalid_status');
SELECT rls_test.refused('a missing status is refused',
  $$SELECT public.set_school_status('e1000000-0000-0000-0000-000000000000', NULL, 'f5000000-0000-0000-0000-000000000001')$$,
  'invalid_status');
SELECT rls_test.refused('an unknown school is refused',
  $$SELECT public.set_school_status('99999999-0000-0000-0000-000000000000', 'suspended', 'f5000000-0000-0000-0000-000000000001')$$,
  'school_not_found');
SELECT rls_test.eq('refused calls changed nothing and wrote no audit row',
  (SELECT count(*) FROM public.audit_log WHERE tenant_id = 'e1000000-0000-0000-0000-000000000000'), 0);

SELECT rls_test.is('suspend: returns true',
  public.set_school_status('e1000000-0000-0000-0000-000000000000', 'suspended', 'f5000000-0000-0000-0000-000000000001')::text, 'true');
SELECT rls_test.is('suspend: status is suspended',
  (SELECT subscription_status::text FROM public.tenants WHERE id = 'e1000000-0000-0000-0000-000000000000'), 'suspended');
SELECT rls_test.is('suspend: one audit row with who, action and from/to',
  (SELECT string_agg(actor_id || ' ' || actor_kind || ' ' || action || ' ' || resource_id || ' ' || result || ' ' || (details ->> 'from') || '>' || (details ->> 'to'), ';')
   FROM public.audit_log WHERE tenant_id = 'e1000000-0000-0000-0000-000000000000'),
  'f5000000-0000-0000-0000-000000000001 platform_admin tenant.update e1000000-0000-0000-0000-000000000000 success active>suspended');

SELECT rls_test.is('same status again: returns false',
  public.set_school_status('e1000000-0000-0000-0000-000000000000', 'suspended', 'f5000000-0000-0000-0000-000000000001')::text, 'false');
SELECT rls_test.eq('same status again: no second audit row',
  (SELECT count(*) FROM public.audit_log WHERE tenant_id = 'e1000000-0000-0000-0000-000000000000'), 1);
RESET ROLE;

-- US-012.3: the suspended school's users are refused at login and token refresh.
SELECT rls_test.is('suspended: the teacher''s login and refresh are refused',
  rls_test.hook('e1000000-0000-0000-0000-000000000001') #>> '{error,message}', 'school_suspended');
SELECT rls_test.is('the other school is untouched',
  (SELECT subscription_status::text FROM public.tenants WHERE id = 'e2000000-0000-0000-0000-000000000000'), 'active');

-- US-012.4: reactivation restores access straight away.
SET LOCAL ROLE service_role;
SELECT rls_test.is('reactivate: returns true',
  public.set_school_status('e1000000-0000-0000-0000-000000000000', 'active', 'f5000000-0000-0000-0000-000000000001')::text, 'true');
RESET ROLE;
SELECT rls_test.is('reactivated: the teacher''s next token carries the school again',
  rls_test.hook('e1000000-0000-0000-0000-000000000001') #>> '{claims,tenant_id}', 'e1000000-0000-0000-0000-000000000000');

-- US-012.2 / US-012.6: every row is exactly as before.
SELECT rls_test.is('suspend and reactivate: every row of the school is unchanged',
  rls_test.school_checksum('e1000000-0000-0000-0000-000000000000'), (SELECT school FROM before_state));
SELECT rls_test.is('the other school''s rows are unchanged',
  rls_test.school_checksum('e2000000-0000-0000-0000-000000000000'), (SELECT other FROM before_state));

-- Cancelled is not a dead end for MVP: a Platform Admin can set any status.
SET LOCAL ROLE service_role;
SELECT rls_test.is('cancel, then back to trial: both allowed',
  (public.set_school_status('e1000000-0000-0000-0000-000000000000', 'cancelled', 'f5000000-0000-0000-0000-000000000001')
   AND public.set_school_status('e1000000-0000-0000-0000-000000000000', 'trial', 'f5000000-0000-0000-0000-000000000001'))::text, 'true');
SELECT rls_test.eq('four status changes, four audit rows',
  (SELECT count(*) FROM public.audit_log WHERE tenant_id = 'e1000000-0000-0000-0000-000000000000' AND action = 'tenant.update'), 4);
RESET ROLE;

-- The change and its audit row are one unit: if the audit row can't be written,
-- the status doesn't change either. (Before 0015 the status changed anyway.)
REVOKE INSERT ON public.audit_log FROM service_role;
SET LOCAL ROLE service_role;
SELECT rls_test.refused('audit insert fails: the call fails',
  $$SELECT public.set_school_status('e1000000-0000-0000-0000-000000000000', 'suspended', 'f5000000-0000-0000-0000-000000000001')$$,
  'permission denied');
SELECT rls_test.is('audit insert fails: the status is not changed',
  (SELECT subscription_status::text FROM public.tenants WHERE id = 'e1000000-0000-0000-0000-000000000000'), 'trial');
RESET ROLE;
GRANT INSERT ON public.audit_log TO service_role;

-- ---------------------------------------------------------------------------
-- update_school_contact (US-012.5)
-- ---------------------------------------------------------------------------

SET LOCAL ROLE service_role;

SELECT rls_test.refused('contact: a user who is not a Platform Admin is refused',
  $$SELECT public.update_school_contact('e1000000-0000-0000-0000-000000000000', 'X', 'x@x.org', 'e1000000-0000-0000-0000-000000000002')$$,
  'not_platform_admin');
SELECT rls_test.refused('contact: an empty name is refused',
  $$SELECT public.update_school_contact('e1000000-0000-0000-0000-000000000000', '   ', 'x@x.org', 'f5000000-0000-0000-0000-000000000001')$$,
  'invalid_contact');
SELECT rls_test.refused('contact: a bad email is refused',
  $$SELECT public.update_school_contact('e1000000-0000-0000-0000-000000000000', 'X', 'not-an-email', 'f5000000-0000-0000-0000-000000000001')$$,
  'invalid_contact');
SELECT rls_test.refused('contact: a missing email is refused',
  $$SELECT public.update_school_contact('e1000000-0000-0000-0000-000000000000', 'X', NULL, 'f5000000-0000-0000-0000-000000000001')$$,
  'invalid_contact');
SELECT rls_test.refused('contact: an unknown school is refused',
  $$SELECT public.update_school_contact('99999999-0000-0000-0000-000000000000', 'X', 'x@x.org', 'f5000000-0000-0000-0000-000000000001')$$,
  'school_not_found');

SELECT rls_test.is('contact: a valid change returns true',
  public.update_school_contact('e1000000-0000-0000-0000-000000000000', '  Ma Kebbeh ', ' Office@Hope.Example ', 'f5000000-0000-0000-0000-000000000001')::text, 'true');
SELECT rls_test.is('contact: saved trimmed, email lowercase',
  (SELECT contact_name || '|' || contact_email FROM public.tenants WHERE id = 'e1000000-0000-0000-0000-000000000000'),
  'Ma Kebbeh|office@hope.example');
SELECT rls_test.is('contact: one audit row with the old and new values',
  (SELECT action || ' ' || (details #>> '{from,contact_email}') || '>' || (details #>> '{to,contact_email}')
   FROM public.audit_log WHERE tenant_id = 'e1000000-0000-0000-0000-000000000000' AND action = 'tenant.update_contact'),
  'tenant.update_contact old@school.org>office@hope.example');
SELECT rls_test.is('contact: the same values again return false',
  public.update_school_contact('e1000000-0000-0000-0000-000000000000', 'Ma Kebbeh', 'office@hope.example', 'f5000000-0000-0000-0000-000000000001')::text, 'false');
SELECT rls_test.eq('contact: no second audit row',
  (SELECT count(*) FROM public.audit_log WHERE tenant_id = 'e1000000-0000-0000-0000-000000000000' AND action = 'tenant.update_contact'), 1);
SELECT rls_test.is('contact: the status is not touched',
  (SELECT subscription_status::text FROM public.tenants WHERE id = 'e1000000-0000-0000-0000-000000000000'), 'trial');
SELECT rls_test.is('contact: the other school is untouched',
  (SELECT contact_email FROM public.tenants WHERE id = 'e2000000-0000-0000-0000-000000000000'), 'other@school.org');
RESET ROLE;

\echo 'All 0015 tests passed. Rolling back.'
ROLLBACK;
