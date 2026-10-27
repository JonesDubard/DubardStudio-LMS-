-- NF-05: school-safety check for the public schema.
-- Run after all migrations (CI runs it right after `supabase db start`):
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f tests/rls/check-tenant-safety.sql
--
-- Rules:
--   1. Every table in public has RLS turned on. No exceptions.
--   2. Every table in public has a tenant_id column, unless it is on the
--      exceptions list below (with a reason).
--   3. Every view in public uses security_invoker, so it applies the caller's
--      RLS instead of the view owner's (which bypasses it).
-- All problems are listed at once; the script fails if there is any.

DO $$
DECLARE
  problems text[] := '{}';
  r record;
BEGIN
  CREATE TEMP TABLE tenant_id_exceptions (table_name text PRIMARY KEY, reason text NOT NULL)
    ON COMMIT DROP;

  -- Exceptions list: tables allowed to have no tenant_id (they still need RLS).
  -- Add a row here, with a reason, in the same PR as the new table.
  INSERT INTO tenant_id_exceptions VALUES
    ('tenants',         'The schools table itself: its id is the tenant id.'),
    ('platform_admins', 'Platform staff work across all schools, so they belong to none.');

  -- 1. RLS on every table
  FOR r IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
    ORDER BY 1
  LOOP
    problems := problems || format('%s: RLS is not enabled', r.relname);
  END LOOP;

  -- 2. tenant_id on every table not on the exceptions list
  FOR r IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      AND NOT EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.oid AND a.attname = 'tenant_id' AND NOT a.attisdropped
      )
      AND c.relname NOT IN (SELECT table_name FROM tenant_id_exceptions)
    ORDER BY 1
  LOOP
    problems := problems || format('%s: no tenant_id column (add one, or add the table to the exceptions list with a reason)', r.relname);
  END LOOP;

  -- 3. Views must use security_invoker
  FOR r IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v'
      AND NOT coalesce(c.reloptions @> ARRAY['security_invoker=true'], false)
      AND NOT coalesce(c.reloptions @> ARRAY['security_invoker=on'], false)
    ORDER BY 1
  LOOP
    problems := problems || format('%s: view without security_invoker = true (it would bypass RLS)', r.relname);
  END LOOP;

  -- Keep the list tidy: warn (don't fail) about stale exceptions.
  FOR r IN
    SELECT e.table_name FROM tenant_id_exceptions e
    WHERE to_regclass('public.' || quote_ident(e.table_name)) IS NULL
  LOOP
    RAISE WARNING 'Exceptions list names a table that does not exist: %', r.table_name;
  END LOOP;

  IF array_length(problems, 1) > 0 THEN
    RAISE EXCEPTION E'School-safety check failed:\n - %', array_to_string(problems, E'\n - ');
  END IF;

  RAISE NOTICE 'School-safety check passed';
END $$;
