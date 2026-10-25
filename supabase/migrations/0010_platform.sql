-- 0010: platform and onboarding.
--   1. audit_log            append-only record of every Platform Admin action (US-014 writes to it)
--   2. subdomain rules      3-30 lowercase letters, digits and hyphens (US-007.2)
--   3. provision_tenant()   creates a school in one transaction, with an audit entry (US-007)
--   4. get_branding()       public: a school's id, name, colours and logos by subdomain,
--                           for the login page before anyone signs in (US-002.1, US-020a.6)
--   5. login hook           refuses login and token refresh for suspended or cancelled
--                           schools and for inactive Platform Admins (US-002.3, US-012.3)
--
-- Needs 0005-0008 applied first. Safe to re-run.
-- Heads-up for seeds: every seeded school's subdomain must match the rule in part 2.
-- Same PR: add ('audit_log', 'Platform-wide and system actions belong to no school.')
-- to the nullable list in tests/rls/check-tenant-safety.sql (audit_log.tenant_id can be NULL).
-- Heads-up for the app: a refused login comes back from Supabase Auth as an error
-- whose message is school_suspended, school_cancelled or platform_admin_inactive.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Preflight
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  missing text[] := '{}';
  bad text;
BEGIN
  IF to_regclass('public.invitations') IS NULL THEN missing := missing || '0008 (invitations)'::text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'platform_admins' AND column_name = 'is_active') THEN
    missing := missing || '0006 (platform_admins.is_active)'::text;
  END IF;
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION '0010 needs these applied first: %', array_to_string(missing, ', ');
  END IF;

  SELECT string_agg(subdomain, ', ') INTO bad
  FROM public.tenants
  WHERE subdomain !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$';
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '0010: these subdomains break the new rule (3-30 lowercase letters, digits, hyphens; no hyphen at either end). Fix them first: %', bad;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. audit_log
--    actor_id has no foreign key on purpose: the log must outlive the user, and
--    an ON DELETE SET NULL would be an UPDATE, which the append-only rule refuses.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_kind text NOT NULL,
  tenant_id uuid REFERENCES public.tenants (id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  result text NOT NULL DEFAULT 'success',
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_actor_kind_check CHECK (actor_kind IN ('platform_admin', 'system', 'user')),
  CONSTRAINT audit_log_result_check CHECK (result IN ('success', 'denied', 'error'))
);

CREATE INDEX IF NOT EXISTS audit_log_tenant_created_idx ON public.audit_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_created_idx  ON public.audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_created_idx ON public.audit_log (action, created_at DESC);

CREATE OR REPLACE FUNCTION public.audit_log_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

REVOKE ALL ON FUNCTION public.audit_log_append_only() FROM PUBLIC;

-- For everyone, the service role included (US-014 acceptance).
DROP TRIGGER IF EXISTS audit_log_no_update_delete ON public.audit_log;
CREATE TRIGGER audit_log_no_update_delete
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_append_only();

DROP TRIGGER IF EXISTS audit_log_no_truncate ON public.audit_log;
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON public.audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION public.audit_log_append_only();

-- Users never read or write it directly: Platform Admins go through Edge
-- Functions with the service role (US-013, US-015). RLS on with no user policy.
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.audit_log;
CREATE POLICY tenant_isolation ON public.audit_log
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.jwt_tenant_id()));

REVOKE ALL ON TABLE public.audit_log FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.audit_log TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Subdomain rule
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  ALTER TABLE public.tenants
    ADD CONSTRAINT tenants_subdomain_format
    CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 3. provision_tenant(): create a school
--    Called by the create-school Edge Function (US-007) with the service role,
--    after it has checked the caller. It checks the Platform Admin again here,
--    so a bad call can't create a school without an accountable actor.
--    One transaction: if anything fails, nothing is left behind.
--    The first School Admin invite is sent afterwards by US-008b.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.provision_tenant(
  p_name text,
  p_subdomain text,
  p_contact_name text,
  p_contact_email text,
  p_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  -- Defaults for every new school (US-007.3: change here once the team agrees them).
  default_primary_color constant text := '#1F3A5F';
  default_secondary_color constant text := '#F2A900';
  reserved constant text[] := ARRAY[
    'www', 'admin', 'api', 'app', 'auth', 'login', 'mail', 'platform',
    'status', 'support', 'help', 'docs', 'static', 'assets', 'cdn', 'dev', 'staging'
  ];
  v_subdomain text := lower(btrim(p_subdomain));
  v_tenant uuid;
  v_constraint text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.id = p_actor_id AND pa.is_active
  ) THEN
    RAISE EXCEPTION 'not_platform_admin: % is not an active Platform Admin', p_actor_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF coalesce(btrim(p_name), '') = '' THEN
    RAISE EXCEPTION 'invalid_name: the school name is required' USING ERRCODE = 'check_violation';
  END IF;
  -- coalesce: a NULL would make the test NULL, and IF NULL skips the error.
  IF coalesce(btrim(p_contact_name), '') = '' OR coalesce(p_contact_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_contact: a contact name and a valid contact email are required'
      USING ERRCODE = 'check_violation';
  END IF;
  IF coalesce(v_subdomain, '') !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' THEN
    RAISE EXCEPTION 'invalid_subdomain: use 3-30 lowercase letters, digits or hyphens, with no hyphen at either end'
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_subdomain = ANY (reserved) THEN
    RAISE EXCEPTION 'reserved_subdomain: % is reserved', v_subdomain USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tenants t WHERE t.subdomain = v_subdomain) THEN
    RAISE EXCEPTION 'subdomain_taken: % is already used', v_subdomain USING ERRCODE = 'unique_violation';
  END IF;

  -- Two calls for the same subdomain at once can both pass the check above;
  -- the unique index stops the second, and this gives it the same clear error.
  BEGIN
    INSERT INTO public.tenants (
      name, subdomain, contact_name, contact_email,
      subscription_status, onboarding_status,
      primary_color, secondary_color, created_by
    ) VALUES (
      btrim(p_name), v_subdomain, btrim(p_contact_name), lower(btrim(p_contact_email)),
      'trial', 'provisioning',
      default_primary_color, default_secondary_color, p_actor_id
    )
    RETURNING id INTO v_tenant;
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
    IF v_constraint = 'tenants_subdomain_key' THEN
      RAISE EXCEPTION 'subdomain_taken: % is already used', v_subdomain USING ERRCODE = 'unique_violation';
    END IF;
    RAISE;
  END;

  INSERT INTO public.audit_log (actor_id, actor_kind, tenant_id, action, resource_type, resource_id, details)
  VALUES (p_actor_id, 'platform_admin', v_tenant, 'tenant.create', 'tenant', v_tenant,
          jsonb_build_object('subdomain', v_subdomain, 'name', btrim(p_name)));

  RETURN v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_tenant(text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_tenant(text, text, text, text, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. get_branding(): public, before sign-in
--    Returns only what the login page needs. Suspended and cancelled schools
--    still return their branding, so the login page can show the school while
--    Auth refuses the login with school_suspended / school_cancelled.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_branding(p_subdomain text)
RETURNS TABLE (
  tenant_id uuid,
  name text,
  primary_color text,
  secondary_color text,
  logo_url text,
  header_logo_url text,
  favicon_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT t.id, t.name, t.primary_color, t.secondary_color, t.logo_url, t.header_logo_url, t.favicon_url
  FROM public.tenants t
  WHERE t.subdomain = lower(btrim(p_subdomain))
$$;

REVOKE ALL ON FUNCTION public.get_branding(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_branding(text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Login hook: same as 0005, plus the school status and Platform Admin checks.
--    Returning an "error" object makes Supabase Auth refuse the login AND every
--    token refresh, so a suspension takes effect within one token lifetime (1 h).
-- ---------------------------------------------------------------------------

-- The hook now reads tenants (runs as supabase_auth_admin).
DROP POLICY IF EXISTS tenants_auth_hook_read ON public.tenants;
CREATE POLICY tenants_auth_hook_read ON public.tenants
  FOR SELECT TO supabase_auth_admin USING (true);
GRANT SELECT ON TABLE public.tenants TO supabase_auth_admin;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  -- Start clean: only this hook decides tenant_id and app_roles.
  claims jsonb := (event->'claims') - 'tenant_id' - 'app_roles';
  uid uuid := (event->>'user_id')::uuid;
  v_admin_active boolean;
  v_tenant uuid;
  v_status public.subscription_status;
  v_roles text[];
BEGIN
  -- Platform admins: no tenant, no profile, no memberships.
  SELECT pa.is_active INTO v_admin_active FROM public.platform_admins pa WHERE pa.id = uid;
  IF FOUND THEN
    IF NOT v_admin_active THEN
      RETURN jsonb_build_object('error', jsonb_build_object(
        'http_code', 403, 'message', 'platform_admin_inactive'));
    END IF;
    claims := jsonb_set(claims, '{app_roles}', '["platform_admin"]');
    RETURN jsonb_set(event, '{claims}', claims);
  END IF;

  SELECT p.tenant_id, t.subscription_status, array_agg(m.role::text ORDER BY m.role::text)
    INTO v_tenant, v_status, v_roles
  FROM public.profiles p
  JOIN public.tenants t ON t.id = p.tenant_id
  JOIN public.memberships m
    ON m.profile_id = p.id AND m.tenant_id = p.tenant_id
  WHERE p.id = uid
    AND p.status = 'active'
    AND m.status = 'active'
  GROUP BY p.tenant_id, t.subscription_status;

  IF v_status IN ('suspended', 'cancelled') THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'school_' || v_status::text));
  END IF;

  -- No active membership => no tenant_id and no roles => RLS denies everything.
  IF v_tenant IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(v_tenant));
    claims := jsonb_set(claims, '{app_roles}', to_jsonb(v_roles));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
