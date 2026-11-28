-- Tests for 0020 (US-009.3): the totals match the schools in the table.
-- Run on a database with 0001-0020 applied; rolled back at the end.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f tests/rls/0020_school_totals_tests.sql
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

CREATE TABLE rls_test.before (total int, active int, trial int, suspended int, cancelled int);
GRANT ALL ON rls_test.before TO service_role;
INSERT INTO rls_test.before SELECT * FROM public.school_status_totals();

-- 2 active, 3 trial, 1 suspended, 1 cancelled
INSERT INTO public.tenants (name, subdomain, contact_name, contact_email, subscription_status, onboarding_status, primary_color, secondary_color) VALUES
 ('T A1','t0020-a1','x','x@example.test','active','provisioning','#1F3A5F','#F2A900'),
 ('T A2','t0020-a2','x','x@example.test','active','provisioning','#1F3A5F','#F2A900'),
 ('T T1','t0020-t1','x','x@example.test','trial','provisioning','#1F3A5F','#F2A900'),
 ('T T2','t0020-t2','x','x@example.test','trial','provisioning','#1F3A5F','#F2A900'),
 ('T T3','t0020-t3','x','x@example.test','trial','provisioning','#1F3A5F','#F2A900'),
 ('T S1','t0020-s1','x','x@example.test','suspended','provisioning','#1F3A5F','#F2A900'),
 ('T C1','t0020-c1','x','x@example.test','cancelled','provisioning','#1F3A5F','#F2A900');

SET LOCAL ROLE service_role;
SELECT rls_test.is('totals grew by exactly the schools just added, per status',
  (SELECT (n.total - b.total) || '/' || (n.active - b.active) || '/' || (n.trial - b.trial) || '/' || (n.suspended - b.suspended) || '/' || (n.cancelled - b.cancelled)
   FROM public.school_status_totals() n, rls_test.before b),
  '7/2/3/1/1');
SELECT rls_test.is('total = the rows in tenants',
  (SELECT total::text FROM public.school_status_totals()), (SELECT count(*)::text FROM public.tenants));
SELECT rls_test.is('active + trial + suspended + cancelled = total',
  (SELECT (active + trial + suspended + cancelled = total)::text FROM public.school_status_totals()), 'true');
SELECT rls_test.is('each status matches a direct count',
  (SELECT active || '/' || trial || '/' || suspended || '/' || cancelled FROM public.school_status_totals()),
  (SELECT count(*) FILTER (WHERE subscription_status = 'active') || '/' || count(*) FILTER (WHERE subscription_status = 'trial')
       || '/' || count(*) FILTER (WHERE subscription_status = 'suspended') || '/' || count(*) FILTER (WHERE subscription_status = 'cancelled')
   FROM public.tenants));
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT rls_test.refused('a signed-in user cannot call it', $q$SELECT * FROM public.school_status_totals()$q$, 'permission denied for function school_status_totals');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT rls_test.refused('nor can anyone not signed in', $q$SELECT * FROM public.school_status_totals()$q$, 'permission denied for function school_status_totals');
RESET ROLE;

\echo 'All 0020 tests passed. Rolling back.'
ROLLBACK;