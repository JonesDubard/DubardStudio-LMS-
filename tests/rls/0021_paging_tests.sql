-- Tests for 0021 (NF-13): the index exists, and 150 rows page cleanly with the keyset rule.
-- Run on a database with 0001-0021 applied; rolled back at the end.
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f tests/rls/0021_paging_tests.sql
\pset tuples_only on
\pset format unaligned
BEGIN;
CREATE SCHEMA rls_test;
CREATE FUNCTION rls_test.is(label text, got text, want text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN RAISE EXCEPTION 'FAIL - % (got %, want %)', label, got, want; END IF;
  RAISE NOTICE 'ok - %', label;
END $$;

SELECT rls_test.is('tenants has the (created_at, id) index',
  (SELECT count(*)::text FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'tenants' AND indexdef LIKE '%(created_at, id)%'), '1');

SELECT rls_test.is('page size: default 20, capped at 100, at least 1',
  public.clamp_page_size(NULL) || '/' || public.clamp_page_size(50) || '/' || public.clamp_page_size(1000) || '/' || public.clamp_page_size(0),
  '20/50/100/1');

-- 150 schools; every 3 share a created_at so the id tiebreak matters.
INSERT INTO public.tenants (name, subdomain, contact_name, contact_email, subscription_status, onboarding_status,
                            primary_color, secondary_color, created_at)
SELECT 'P ' || g, 't0021-' || lpad(g::text, 3, '0'), 'x', 'x@example.test', 'trial', 'provisioning',
       '#1F3A5F', '#F2A900', timestamptz '2026-01-01 00:00:00+00' + ((g / 3) * interval '1 minute')
FROM generate_series(1, 150) g;

CREATE TABLE rls_test.seen (page int, id uuid, created_at timestamptz);

DO $$
DECLARE
  p int := 0; c timestamptz; i uuid; n int;
BEGIN
  LOOP
    p := p + 1;
    IF p > 5 THEN RAISE EXCEPTION 'FAIL - paging did not finish'; END IF;
    INSERT INTO rls_test.seen
      SELECT p, t.id, t.created_at FROM public.tenants t
      WHERE t.subdomain LIKE 't0021-%' AND (c IS NULL OR (t.created_at, t.id) < (c, i))
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT public.clamp_page_size(1000);
    GET DIAGNOSTICS n = ROW_COUNT;
    EXIT WHEN n < 100;
    SELECT s.created_at, s.id INTO c, i FROM rls_test.seen s WHERE s.page = p ORDER BY s.created_at, s.id LIMIT 1;
  END LOOP;
END $$;

SELECT rls_test.is('150 rows come back as a page of 100 and a page of 50',
  (SELECT string_agg(cnt::text, ',' ORDER BY page) FROM (SELECT page, count(*) AS cnt FROM rls_test.seen GROUP BY page) x),
  '100,50');
SELECT rls_test.is('no repeats and no gaps', (SELECT count(DISTINCT id)::text FROM rls_test.seen), '150');
SELECT rls_test.is('the pages are in the same order as one big sorted query',
  (SELECT string_agg(id::text, ',' ORDER BY page, created_at DESC, id DESC) FROM rls_test.seen),
  (SELECT string_agg(id::text, ',' ORDER BY created_at DESC, id DESC) FROM public.tenants WHERE subdomain LIKE 't0021-%'));

\echo 'All 0021 tests passed. Rolling back.'
ROLLBACK;