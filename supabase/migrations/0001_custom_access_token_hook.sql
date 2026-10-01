-- Auth spike: tables the custom access token hook reads, the hook itself,
-- and a service-role-only helper the RLS proof test uses for DDL.
-- Academic tables are intentionally not in this migration.
--
-- Apply in the Supabase SQL editor, then register the hook in
-- Dashboard → Authentication → Hooks. See scripts/enable-auth-hook.ts.

-- ---------------------------------------------------------------------------
-- Enums and tables (docs/data-model.md §4 and §5)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  CREATE TYPE public.subscription_status AS ENUM (
    'trial',
    'active',
    'suspended',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.grade_capture_mode AS ENUM ('lms', 'sms', 'both');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'school_admin',
    'teacher',
    'student',
    'parent'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subdomain text NOT NULL UNIQUE,
  custom_domain text,
  subscription_status public.subscription_status NOT NULL DEFAULT 'trial',
  grade_capture_mode public.grade_capture_mode NOT NULL DEFAULT 'lms',
  primary_color text,
  secondary_color text,
  logo_url text,
  favicon_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  role public.user_role NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Platform-level tables are exempt from per-tenant RLS, but enabling RLS
-- with no policies keeps the Data API from exposing them through the
-- publishable key. The service role still bypasses RLS.
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- The hook function below is SECURITY INVOKER (as specified in
-- docs/data-model.md §10) and runs as supabase_auth_admin. These policies
-- are what let that role read the rows it needs. Without them, a locked
-- table would hide every profile and the JWT would never receive tenant_id.
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_admins_auth_hook_read ON public.platform_admins;
CREATE POLICY platform_admins_auth_hook_read ON public.platform_admins
  FOR SELECT
  TO supabase_auth_admin
  USING (true);

DROP POLICY IF EXISTS profiles_auth_hook_read ON public.profiles;
CREATE POLICY profiles_auth_hook_read ON public.profiles
  FOR SELECT
  TO supabase_auth_admin
  USING (true);

-- ---------------------------------------------------------------------------
-- Hook function — exact body from docs/data-model.md §10
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_tenant_id uuid;
  user_role text;
  is_platform_admin boolean;
BEGIN
  claims := event->'claims';

  -- Check platform_admins first (no tenant, no profiles row)
  SELECT EXISTS(
    SELECT 1 FROM public.platform_admins
    WHERE id = (event->>'user_id')::uuid
  ) INTO is_platform_admin;

  IF is_platform_admin THEN
    claims := jsonb_set(claims, '{app_role}', '"platform_admin"');
    RETURN jsonb_set(event, '{claims}', claims);
  END IF;

  -- Otherwise resolve tenant + role from profiles
  SELECT tenant_id, role INTO user_tenant_id, user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  IF user_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id));
  END IF;

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_role}', to_jsonb(user_role));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Supabase Auth runs the hook as supabase_auth_admin. EXECUTE is granted
-- to PUBLIC by default in Postgres, so revoke that and grant only the
-- auth role. The hook also needs SELECT on the two tables it reads.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb)
  TO supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb)
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.platform_admins TO supabase_auth_admin;
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Spike-only DDL helper for tests/e2e/auth-jwt.spec.ts
-- Drop this function before the pilot. It is granted only to service_role.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auth_spike_exec(statement text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF statement !~* '^[[:space:]]*(create|drop|alter|grant|revoke|notify|comment)[[:space:]]' THEN
    RAISE EXCEPTION 'auth_spike_exec refused this statement';
  END IF;

  EXECUTE statement;
END;
$$;

REVOKE ALL ON FUNCTION public.auth_spike_exec(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_spike_exec(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_spike_exec(text) TO service_role;
