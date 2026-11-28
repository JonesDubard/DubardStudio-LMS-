-- 0021: indexes for cursor paging (NF-13.3) and a page-size helper for database functions (NF-13.2).
-- Rename this file to the next free number if 0021 is taken.
BEGIN;

-- One ascending index serves both newest-first and oldest-first (Postgres scans it backwards).
CREATE INDEX IF NOT EXISTS tenants_created_at_id_idx ON public.tenants (created_at, id);

-- For each school-scoped table that gets a list endpoint, add the same, starting with tenant_id:
-- CREATE INDEX IF NOT EXISTS <table>_tenant_created_at_id_idx ON public.<table> (tenant_id, created_at, id);

-- Page size for database functions: default 20, never above 100.
CREATE OR REPLACE FUNCTION public.clamp_page_size(p_size integer)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$ SELECT CASE WHEN p_size IS NULL THEN 20 ELSE least(greatest(p_size, 1), 100) END $$;

REVOKE ALL ON FUNCTION public.clamp_page_size(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clamp_page_size(integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;