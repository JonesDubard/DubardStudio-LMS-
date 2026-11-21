-- 0015: change a school's status and contact details (US-012)
--   1. set_school_status()      trial / active / suspended / cancelled, with an audit row
--   2. update_school_contact()  contact name and email, with an audit row
--
-- Why functions: the change and its audit row are written in one transaction.
-- Before this, the Platform console updated tenants and then inserted the audit
-- row as a second call, so a failed audit insert left the change with no record
-- (checked locally on 17 Nov). Same pattern as provision_tenant() in 0010.
--
-- Both run as the caller (no SECURITY DEFINER) and only the service role may call
-- them, like provision_tenant(). The Next.js server actions in
-- app/(platform)/platform/actions.ts call them with createAdminClient().
--
-- Changing the status only updates subscription_status: no cascades, no clean-up
-- (US-012.2). Suspended and cancelled schools are refused at login and token
-- refresh by the 0010 login hook (US-012.3); setting a school back to trial or
-- active works on the next login or refresh (US-012.4).
--
-- Audit actions:
--   tenant.update          status change, details {from, to}. Same action and details
--                          the console already writes and reads for Subscription History.
--   tenant.update_contact  contact change, details {from: {...}, to: {...}}
--
-- Safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. set_school_status()
--    Returns true when the status changed, false when it already had that value
--    (nothing written, no audit row).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_school_status(
  p_tenant_id uuid,
  p_status text,
  p_actor_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_new  public.subscription_status;
  v_old  public.subscription_status;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.id = p_actor_id AND pa.is_active
  ) THEN
    RAISE EXCEPTION 'not_platform_admin: % is not an active Platform Admin', p_actor_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('trial', 'active', 'suspended', 'cancelled') THEN
    RAISE EXCEPTION 'invalid_status: use trial, active, suspended or cancelled'
      USING ERRCODE = 'check_violation';
  END IF;
  v_new := p_status::public.subscription_status;

  -- FOR UPDATE: two admins changing the same school at once are handled one after
  -- the other, so each audit row has the right "from".
  SELECT t.subscription_status INTO v_old
  FROM public.tenants t WHERE t.id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'school_not_found: %', p_tenant_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_old = v_new THEN
    RETURN false;
  END IF;

  UPDATE public.tenants SET subscription_status = v_new WHERE id = p_tenant_id;

  INSERT INTO public.audit_log (actor_id, actor_kind, tenant_id, action, resource_type, resource_id, details)
  VALUES (p_actor_id, 'platform_admin', p_tenant_id, 'tenant.update', 'tenant', p_tenant_id,
          jsonb_build_object('from', v_old::text, 'to', v_new::text));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_school_status(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_school_status(uuid, text, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. update_school_contact()
--    Same checks as provision_tenant(): a name, and an email that looks like one.
--    The email is stored trimmed and lowercase. Returns false when nothing changed.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_school_contact(
  p_tenant_id uuid,
  p_contact_name text,
  p_contact_email text,
  p_actor_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_name  text := btrim(p_contact_name);
  v_email text := lower(btrim(p_contact_email));
  v_old_name  text;
  v_old_email text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.id = p_actor_id AND pa.is_active
  ) THEN
    RAISE EXCEPTION 'not_platform_admin: % is not an active Platform Admin', p_actor_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- coalesce: a NULL would make the test NULL, and IF NULL skips the error.
  IF coalesce(v_name, '') = '' OR length(v_name) > 200
     OR coalesce(v_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email) > 320 THEN
    RAISE EXCEPTION 'invalid_contact: a contact name and a valid contact email are required'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT t.contact_name, t.contact_email INTO v_old_name, v_old_email
  FROM public.tenants t WHERE t.id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'school_not_found: %', p_tenant_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_old_name IS NOT DISTINCT FROM v_name AND v_old_email IS NOT DISTINCT FROM v_email THEN
    RETURN false;
  END IF;

  UPDATE public.tenants SET contact_name = v_name, contact_email = v_email WHERE id = p_tenant_id;

  INSERT INTO public.audit_log (actor_id, actor_kind, tenant_id, action, resource_type, resource_id, details)
  VALUES (p_actor_id, 'platform_admin', p_tenant_id, 'tenant.update_contact', 'tenant', p_tenant_id,
          jsonb_build_object(
            'from', jsonb_build_object('contact_name', v_old_name, 'contact_email', v_old_email),
            'to',   jsonb_build_object('contact_name', v_name,     'contact_email', v_email)));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_school_contact(uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_school_contact(uuid, text, text, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;