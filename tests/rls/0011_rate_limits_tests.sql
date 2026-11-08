-- Tests for 0011. Run on a database with 0001-0011 applied. Everything runs in
-- one transaction and is rolled back at the end.
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f tests/rls/0011_rate_limits_tests.sql
-- Each check prints "ok - ..."; the first failure stops the script with "FAIL - ...".
-- Takes about 2 seconds (it waits for a 1-second window to end).

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

-- One request against a limit of 3 per 1 second, as the service role would send it.
-- Returns "allowed/retry_after", e.g. "t/0" or "f/1".
CREATE FUNCTION rls_test.hit(bucket text, subject text) RETURNS text
LANGUAGE sql AS $$
  SELECT r.allowed::text || '/' || r.retry_after_seconds FROM public.rate_limit_hit(bucket, subject, 3, 1) r
$$;

GRANT USAGE ON SCHEMA rls_test TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rls_test TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Counting, as the service role (what Edge Functions use)
-- ---------------------------------------------------------------------------

SET LOCAL ROLE service_role;

SELECT rls_test.is('request 1 of 3 allowed', rls_test.hit('upload', 'user:a'), 'true/0');
SELECT rls_test.is('request 2 of 3 allowed', rls_test.hit('upload', 'user:a'), 'true/0');
SELECT rls_test.is('request 3 of 3 allowed', rls_test.hit('upload', 'user:a'), 'true/0');
SELECT rls_test.is('request 4 refused, try again in 1 second', rls_test.hit('upload', 'user:a'), 'false/1');
SELECT rls_test.is('request 5 still refused', rls_test.hit('upload', 'user:a'), 'false/1');

SELECT rls_test.is('another user has their own count', rls_test.hit('upload', 'user:b'), 'true/0');
SELECT rls_test.is('another bucket has its own count', rls_test.hit('invite', 'user:a'), 'true/0');

SELECT rls_test.refused('the service role cannot read the counters directly',
  $$SELECT count(*) FROM public.rate_limit_counters$$, 'permission denied');
SELECT rls_test.refused('a zero limit is refused',
  $$SELECT * FROM public.rate_limit_hit('upload', 'user:a', 0, 60)$$, 'invalid_limit');
SELECT rls_test.refused('a zero window is refused',
  $$SELECT * FROM public.rate_limit_hit('upload', 'user:a', 3, 0)$$, 'invalid_limit');
SELECT rls_test.refused('a bad bucket name is refused',
  $$SELECT * FROM public.rate_limit_hit('Upload!', 'user:a', 3, 60)$$, 'rate_limit_counters_bucket_check');

RESET ROLE;

-- The count stops just past the limit (no overflow from a flood).
SELECT rls_test.is('count is capped at limit + 1',
  (SELECT hits::text FROM public.rate_limit_counters WHERE bucket = 'upload' AND subject = 'user:a'), '4');

-- A long window reports the right wait.
SET LOCAL ROLE service_role;
SELECT FROM public.rate_limit_hit('import', 'school:x', 1, 3600);
SELECT rls_test.is('over an hourly limit: wait close to an hour',
  (SELECT (r.retry_after_seconds BETWEEN 3590 AND 3600)::text FROM public.rate_limit_hit('import', 'school:x', 1, 3600) r), 'true');

-- ---------------------------------------------------------------------------
-- After the window
-- ---------------------------------------------------------------------------

SELECT pg_sleep(1.1);
SELECT rls_test.is('allowed again after the window', rls_test.hit('upload', 'user:a'), 'true/0');
RESET ROLE;
SELECT rls_test.is('new window starts the count at 1',
  (SELECT hits::text FROM public.rate_limit_counters WHERE bucket = 'upload' AND subject = 'user:a'), '1');

-- ---------------------------------------------------------------------------
-- Users can't see or touch counters
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT rls_test.refused('signed-in user cannot call rate_limit_hit',
  $$SELECT * FROM public.rate_limit_hit('upload', 'user:a', 3, 1)$$, 'permission denied');
SELECT rls_test.refused('signed-in user cannot read counters',
  $$SELECT count(*) FROM public.rate_limit_counters$$, 'permission denied');
SELECT rls_test.refused('signed-in user cannot reset counters',
  $$DELETE FROM public.rate_limit_counters$$, 'permission denied');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT rls_test.refused('anonymous caller cannot call rate_limit_hit',
  $$SELECT * FROM public.rate_limit_hit('upload', 'user:a', 3, 1)$$, 'permission denied');
RESET ROLE;

\echo 'All 0011 tests passed. Rolling back.'
ROLLBACK;
