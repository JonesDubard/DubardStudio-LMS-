-- Tests for 0017 (US-007.3c): a new school gets a current school year with 3 terms,
-- and no classes or subjects.Everything runs in one transaction and is rolled back at the end.
-- Each check prints "ok - ..."; the first failure stops the script with "FAIL - ...".
-- Dates are checked through default_term_plan(date), so the tests give the same answer on any day.

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

-- "year/term" of the current term in the plan for a date, e.g. 2026-2027/T2.
CREATE FUNCTION rls_test.current_of(d date) RETURNS text
LANGUAGE sql AS $$
  SELECT p.year_name || '/T' || p.seq FROM public.default_term_plan(d) p WHERE p.is_current
$$;

-- Row counts that must not change when a call is refused.
CREATE FUNCTION rls_test.snap() RETURNS text
LANGUAGE sql AS $$
  SELECT (SELECT count(*) FROM public.tenants) || '/' || (SELECT count(*) FROM public.academic_years)
    || '/' || (SELECT count(*) FROM public.terms) || '/' || (SELECT count(*) FROM public.audit_log)
$$;

CREATE TABLE rls_test.ctx (school uuid);
CREATE TABLE rls_test.snaps (label text, v text);
GRANT USAGE ON SCHEMA rls_test TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rls_test TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA rls_test TO service_role;

-- An active Platform Admin to act as. If your 0010 tests already create one, reuse that.
INSERT INTO auth.users (id, email) VALUES ('90000000-0000-4000-8000-0000000000a1', 'admin-0015@example.test');
INSERT INTO public.platform_admins (id, email, full_name, is_active)
VALUES ('90000000-0000-4000-8000-0000000000a1', 'admin-0015@example.test', 'Test Admin 0015', true);

-- ---------------------------------------------------------------------------
-- 1. The defaults for any date
-- ---------------------------------------------------------------------------

SELECT rls_test.is('1 Sep: year 2026-2027, Term 1 current',      rls_test.current_of('2026-09-01'), '2026-2027/T1');
SELECT rls_test.is('31 Dec: still Term 1',                        rls_test.current_of('2026-12-31'), '2026-2027/T1');
SELECT rls_test.is('1 Jan: Term 2, same school year',             rls_test.current_of('2027-01-01'), '2026-2027/T2');
SELECT rls_test.is('15 Feb: Term 2',                              rls_test.current_of('2027-02-15'), '2026-2027/T2');
SELECT rls_test.is('31 Mar: Term 2',                              rls_test.current_of('2027-03-31'), '2026-2027/T2');
SELECT rls_test.is('1 Apr: Term 3',                               rls_test.current_of('2027-04-01'), '2026-2027/T3');
SELECT rls_test.is('30 Jun: Term 3',                              rls_test.current_of('2027-06-30'), '2026-2027/T3');
SELECT rls_test.is('1 Jul: next school year, Term 1 current',     rls_test.current_of('2027-07-01'), '2027-2028/T1');
SELECT rls_test.is('31 Aug: next school year, Term 1 current',    rls_test.current_of('2027-08-31'), '2027-2028/T1');

SELECT rls_test.is('three terms, named, in order, with the agreed dates',
  (SELECT string_agg(p.term_name || ':' || p.term_start || '..' || p.term_end, ' | ' ORDER BY p.seq)
   FROM public.default_term_plan('2026-10-15') p),
  'Term 1:2026-09-01..2026-12-31 | Term 2:2027-01-01..2027-03-31 | Term 3:2027-04-01..2027-06-30');

SELECT rls_test.is('the school year runs 1 Sep to 31 Aug',
  (SELECT DISTINCT p.year_start || '..' || p.year_end FROM public.default_term_plan('2026-10-15') p),
  '2026-09-01..2027-08-31');

-- Every day for five years: one current term, terms inside the year, no overlap,
-- and the current term holds today (except in the July-August gap).
DO $$
DECLARE
  d date;
  bad text;
BEGIN
  FOR d IN SELECT g::date FROM generate_series('2026-01-01'::timestamp, '2030-12-31'::timestamp, '1 day') g LOOP
    IF (SELECT count(*) FROM public.default_term_plan(d)) <> 3 THEN bad := 'not 3 terms on ' || d; END IF;
    IF (SELECT count(*) FROM public.default_term_plan(d) WHERE is_current) <> 1 THEN bad := 'not exactly one current term on ' || d; END IF;
    IF EXISTS (SELECT 1 FROM public.default_term_plan(d) p WHERE p.term_start < p.year_start OR p.term_end > p.year_end OR p.term_end < p.term_start) THEN
      bad := 'a term is outside its year or ends before it starts on ' || d;
    END IF;
    IF EXISTS (SELECT 1 FROM public.default_term_plan(d) a JOIN public.default_term_plan(d) b ON a.seq < b.seq AND b.term_start <= a.term_end) THEN
      bad := 'terms overlap on ' || d;
    END IF;
    IF extract(month FROM d) NOT IN (7, 8)
       AND NOT EXISTS (SELECT 1 FROM public.default_term_plan(d) p WHERE p.is_current AND d BETWEEN p.term_start AND p.term_end) THEN
      bad := 'the current term does not hold ' || d;
    END IF;
    IF bad IS NOT NULL THEN RAISE EXCEPTION 'FAIL - default_term_plan: %', bad; END IF;
  END LOOP;
  RAISE NOTICE 'ok - every day 2026-2030: 3 terms, 1 current, inside the year, no overlap';
END $$;

-- ---------------------------------------------------------------------------
-- 2. A new school gets the defaults and nothing else
-- ---------------------------------------------------------------------------

SET LOCAL ROLE service_role;
INSERT INTO rls_test.ctx
SELECT public.provision_tenant('Test School 0015', 'test-0015-a', 'Ada Contact', 'ada@example.test',
                               '90000000-0000-4000-8000-0000000000a1');
RESET ROLE;

SELECT rls_test.is('colours are the agreed defaults',
  (SELECT t.primary_color || '/' || t.secondary_color FROM public.tenants t WHERE t.id = (SELECT school FROM rls_test.ctx)),
  '#1F3A5F/#F2A900');

SELECT rls_test.is('no logo: the apps show the school name instead',
  (SELECT (t.logo_url IS NULL AND t.header_logo_url IS NULL AND t.favicon_url IS NULL)::text
   FROM public.tenants t WHERE t.id = (SELECT school FROM rls_test.ctx)),
  'true');

SELECT rls_test.is('exactly one school year, and it is current',
  (SELECT count(*) || '/' || count(*) FILTER (WHERE is_current)
   FROM public.academic_years WHERE tenant_id = (SELECT school FROM rls_test.ctx)),
  '1/1');

SELECT rls_test.is('the school year is the one for today',
  (SELECT y.name || ' ' || y.start_date || '..' || y.end_date FROM public.academic_years y
   WHERE y.tenant_id = (SELECT school FROM rls_test.ctx)),
  (SELECT DISTINCT p.year_name || ' ' || p.year_start || '..' || p.year_end FROM public.default_term_plan(current_date) p));

SELECT rls_test.is('three terms, numbered 1 to 3, named Term 1 to Term 3',
  (SELECT string_agg(t.sequence || '=' || t.name, ',' ORDER BY t.sequence)
   FROM public.terms t WHERE t.tenant_id = (SELECT school FROM rls_test.ctx)),
  '1=Term 1,2=Term 2,3=Term 3');

SELECT rls_test.is('term dates match the plan',
  (SELECT string_agg(t.start_date || '..' || t.end_date, ' ' ORDER BY t.sequence)
   FROM public.terms t WHERE t.tenant_id = (SELECT school FROM rls_test.ctx)),
  (SELECT string_agg(p.term_start || '..' || p.term_end, ' ' ORDER BY p.seq) FROM public.default_term_plan(current_date) p));

SELECT rls_test.is('all three terms belong to the new school year',
  (SELECT count(*) FILTER (WHERE t.academic_year_id = y.id) || '/' || count(*)
   FROM public.terms t JOIN public.academic_years y ON y.tenant_id = t.tenant_id
   WHERE t.tenant_id = (SELECT school FROM rls_test.ctx)),
  '3/3');

SELECT rls_test.is('exactly one current term, the one the plan says',
  (SELECT count(*) FILTER (WHERE t.is_current) || ' T' || min(t.sequence) FILTER (WHERE t.is_current)
   FROM public.terms t WHERE t.tenant_id = (SELECT school FROM rls_test.ctx)),
  (SELECT '1 T' || p.seq FROM public.default_term_plan(current_date) p WHERE p.is_current));

SELECT rls_test.is('no classes, subjects, class-subjects, courses or lessons yet',
  (SELECT (SELECT count(*) FROM public.classes        WHERE tenant_id = c.school) || ','
       || (SELECT count(*) FROM public.subjects       WHERE tenant_id = c.school) || ','
       || (SELECT count(*) FROM public.class_subjects WHERE tenant_id = c.school) || ','
       || (SELECT count(*) FROM public.courses        WHERE tenant_id = c.school) || ','
       || (SELECT count(*) FROM public.lessons        WHERE tenant_id = c.school)
   FROM rls_test.ctx c),
  '0,0,0,0,0');

SELECT rls_test.is('one audit entry for the school',
  (SELECT count(*)::text FROM public.audit_log WHERE action = 'tenant.create' AND tenant_id = (SELECT school FROM rls_test.ctx)),
  '1');

-- ---------------------------------------------------------------------------
-- 3. Refused calls create nothing (twice, bad, reserved, not an admin)
-- ---------------------------------------------------------------------------

INSERT INTO rls_test.snaps SELECT 'before', rls_test.snap();

SET LOCAL ROLE service_role;
SELECT rls_test.refused('the same subdomain again is refused',
  $q$SELECT public.provision_tenant('Test School 0015', 'test-0015-a', 'Ada Contact', 'ada@example.test', '90000000-0000-4000-8000-0000000000a1')$q$,
  'subdomain_taken');
SELECT rls_test.refused('the same subdomain in capitals with spaces is refused too',
  $q$SELECT public.provision_tenant('Test School 0015', '  TEST-0015-A ', 'Ada Contact', 'ada@example.test', '90000000-0000-4000-8000-0000000000a1')$q$,
  'subdomain_taken');
SELECT rls_test.refused('a bad subdomain is refused',
  $q$SELECT public.provision_tenant('Test School 0015', 'Bad_Name', 'Ada Contact', 'ada@example.test', '90000000-0000-4000-8000-0000000000a1')$q$,
  'invalid_subdomain');
SELECT rls_test.refused('a reserved subdomain is refused',
  $q$SELECT public.provision_tenant('Test School 0015', 'admin', 'Ada Contact', 'ada@example.test', '90000000-0000-4000-8000-0000000000a1')$q$,
  'reserved_subdomain');
SELECT rls_test.refused('someone who is not a Platform Admin cannot create a school',
  $q$SELECT public.provision_tenant('Test School 0015', 'test-0015-c', 'Ada Contact', 'ada@example.test', '90000000-0000-4000-8000-0000000000ff')$q$,
  'not_platform_admin');
RESET ROLE;

SELECT rls_test.is('after five refused calls: no new school, year, term or audit entry',
  rls_test.snap(), (SELECT v FROM rls_test.snaps WHERE label = 'before'));

-- ---------------------------------------------------------------------------
-- 4. A failure after the year and terms were written leaves nothing behind
--    A trigger makes the very last step (the audit entry) fail.
-- ---------------------------------------------------------------------------

CREATE FUNCTION rls_test.fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'forced failure for test';
END $$;
CREATE TRIGGER rls_test_fail_audit BEFORE INSERT ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION rls_test.fail_audit();

SET LOCAL ROLE service_role;
SELECT rls_test.refused('a failure at the last step is reported',
  $q$SELECT public.provision_tenant('Test School 0015 B', 'test-0015-b', 'Ada Contact', 'ada@example.test', '90000000-0000-4000-8000-0000000000a1')$q$,
  'forced failure');
RESET ROLE;

DROP TRIGGER rls_test_fail_audit ON public.audit_log;

SELECT rls_test.is('the failed school left no school, year or terms behind',
  rls_test.snap(), (SELECT v FROM rls_test.snaps WHERE label = 'before'));
SELECT rls_test.is('and its subdomain is still free',
  (SELECT count(*)::text FROM public.tenants WHERE subdomain = 'test-0015-b'), '0');

\echo 'All 0017 tests passed. Rolling back.'
ROLLBACK;