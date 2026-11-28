-- 0020X: totals of schools by subscription status (US-009.3)
--   school_status_totals()   one row: total, active, trial, suspended, cancelled
--
-- Counts every school, in one query, so the totals always match the tenants table and do not
-- depend on the page or the filters of the list. Called by the admin-list-schools Edge Function
-- with the service role. Safe to re-run.

BEGIN;

CREATE OR REPLACE FUNCTION public.school_status_totals()
RETURNS TABLE (total integer, active integer, trial integer, suspended integer, cancelled integer)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    count(*)::integer,
    (count(*) FILTER (WHERE t.subscription_status = 'active'))::integer,
    (count(*) FILTER (WHERE t.subscription_status = 'trial'))::integer,
    (count(*) FILTER (WHERE t.subscription_status = 'suspended'))::integer,
    (count(*) FILTER (WHERE t.subscription_status = 'cancelled'))::integer
  FROM public.tenants t
$$;

REVOKE ALL ON FUNCTION public.school_status_totals() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.school_status_totals() TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;