-- 0014: rate limits (NF-07a.2)
--   1. rate_limit_counters   one counter per (bucket, subject), counted over a fixed window
--   2. rate_limit_hit()      counts one request and says whether it is allowed, in one step
--   3. rate_limit_cleanup()  deletes counters older than a day (to be run daily, see below)
--
-- Not in the ERD on purpose: this table holds technical counters only (a key, a
-- window start and a count). It has no school data and no links to other tables,
-- and emptying it loses nothing. See NF-07a.
--
-- Only Edge Functions use it, through the service role (_shared/rate_limit.ts).
-- Users can't read, change or reset counters.
--
-- Same PR: add ('rate_limit_counters', ...) to the exceptions list in
-- tests/rls/check-tenant-safety.sql (it has no tenant_id).
--
-- Safe to re-run.
 
BEGIN;
 
-- ---------------------------------------------------------------------------
-- 1. Counters
--    subject is "<kind>:<id>", e.g. "user:<uuid>", "admin:<uuid>", "school:<uuid>".
--    One row per (bucket, subject); a new window overwrites the row, so the
--    table only grows with the number of real users and schools (the Edge
--    Function only passes ids of signed-in callers, never caller-supplied text).
-- ---------------------------------------------------------------------------
 
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  bucket       text        NOT NULL CHECK (bucket ~ '^[a-z][a-z_]{0,39}$'),
  subject      text        NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),
  window_start timestamptz NOT NULL,
  hits         integer     NOT NULL CHECK (hits >= 1),
  PRIMARY KEY (bucket, subject)
);
 
-- RLS on with no policies, and no grants: nobody but the function below can touch it.
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_limit_counters FROM PUBLIC, anon, authenticated, service_role;
 
-- ---------------------------------------------------------------------------
-- 2. rate_limit_hit()
--    Counts this request and returns allowed = hits <= p_limit. When refused,
--    retry_after_seconds says when the window ends (at least 1).
--    One INSERT ... ON CONFLICT, so two requests at the same moment can't both
--    slip under the limit.
--    Uses clock_timestamp(), not now(): now() is frozen for a whole transaction,
--    which would break the window inside a transaction (and in the tests).
-- ---------------------------------------------------------------------------
 
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_bucket text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE (allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now    timestamptz := clock_timestamp();
  v_window interval;
  v_start  timestamptz;
  v_hits   integer;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'invalid_limit: p_limit and p_window_seconds must be at least 1'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  v_window := make_interval(secs => p_window_seconds);
 
  INSERT INTO public.rate_limit_counters AS c (bucket, subject, window_start, hits)
  VALUES (p_bucket, p_subject, v_now, 1)
  ON CONFLICT (bucket, subject) DO UPDATE
    SET hits = CASE
                 WHEN c.window_start + v_window <= v_now THEN 1
                 -- Stop counting just past the limit, so a flood can't overflow the integer.
                 ELSE least(c.hits + 1, p_limit + 1)
               END,
        window_start = CASE
                 WHEN c.window_start + v_window <= v_now THEN v_now
                 ELSE c.window_start
               END
  RETURNING c.window_start, c.hits INTO v_start, v_hits;
 
  allowed := v_hits <= p_limit;
  retry_after_seconds := CASE
    WHEN allowed THEN 0
    ELSE greatest(1, ceil(extract(epoch FROM (v_start + v_window - v_now)))::integer)
  END;
  RETURN NEXT;
END;
$$;
 
REVOKE ALL ON FUNCTION public.rate_limit_hit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, text, integer, integer) TO service_role;
 
-- ---------------------------------------------------------------------------
-- 3. rate_limit_cleanup()
--    Deletes counters whose window started more than a day ago. Every limit is
--    an hour or less, so nothing in use is removed. Returns how many rows went.
--    To be run once a day. Scheduling is part of NF-11a (background jobs); until
--    then the table stays small (one row per user, admin or school and bucket).
-- ---------------------------------------------------------------------------
 
CREATE OR REPLACE FUNCTION public.rate_limit_cleanup()
RETURNS integer
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH gone AS (
    DELETE FROM public.rate_limit_counters
    WHERE window_start < clock_timestamp() - interval '1 day'
    RETURNING 1
  )
  SELECT count(*)::integer FROM gone
$$;
 
REVOKE ALL ON FUNCTION public.rate_limit_cleanup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_cleanup() TO service_role;
 
NOTIFY pgrst, 'reload schema';
 
COMMIT;
