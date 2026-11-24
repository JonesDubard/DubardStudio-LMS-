-- 0020: a Platform Admin invites a School Admin (US-036)
--   1. create_school_admin_invitation()  makes ONE new School Admin invitation for one school,
--                                        with an audit row, or refuses with a clear code
--   2. create_school_invitation()        (from 0019) now refuses role school_admin:
--                                        a School Admin can't invite another School Admin
--
-- Why a separate function and not create_school_invitation() from 0019:
--   create_school_invitation() checks that the inviter is an active School Admin of the
--   school. Here the inviter is a Platform Admin, who has no profile in any school (0008),
--   so that check can never pass. This function checks platform_admins instead, like
--   provision_tenant() (0010) and set_school_status() (0015).
--
-- Why the audit row is written here: the invitation and its audit row are saved in one
-- transaction. If either fails, neither is saved (same pattern as 0015).
-- Audit action: invite.create (0016 uses invite.accept), resource invitation, details {role, email}.
-- A refused call raises an error, so it rolls back and leaves no row (nothing was changed).
--
-- Error messages start with a code (the app maps them to plain sentences):
--   not_platform_admin, invalid_email, invalid_token_hash, school_not_found,
--   school_suspended, school_cancelled, already_member, already_invited
-- Safe to re-run. Needs 0008, 0010, 0018 and 0019.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. create_school_admin_invitation()
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_school_admin_invitation(
  p_tenant_id uuid,
  p_email text,
  p_actor_id uuid,
  p_token_hash text
)
RETURNS TABLE (invitation_id uuid, reused boolean)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_status public.subscription_status;
  v_id uuid;
BEGIN
  -- 1. Who is inviting: an active Platform Admin, nobody else.
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.id = p_actor_id AND pa.is_active
  ) THEN
    RAISE EXCEPTION 'not_platform_admin: only an active Platform Admin can invite a School Admin'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. The input (same rules as 0018 and 0019).
  IF coalesce(v_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email) > 320 THEN
    RAISE EXCEPTION 'invalid_email: a valid email is required' USING ERRCODE = 'check_violation';
  END IF;
  IF coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid_token_hash' USING ERRCODE = 'check_violation';
  END IF;

  -- 3. The school must exist and be open.
  SELECT t.subscription_status INTO v_status FROM public.tenants t WHERE t.id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'school_not_found: %', p_tenant_id USING ERRCODE = 'no_data_found';
  END IF;
  IF v_status IN ('suspended', 'cancelled') THEN
    RAISE EXCEPTION 'school_%', v_status::text USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 4. Already a School Admin here: no invite needed.
  IF EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.profiles p ON p.id = m.profile_id AND p.tenant_id = m.tenant_id
    WHERE m.tenant_id = p_tenant_id AND m.role = 'school_admin' AND m.status <> 'removed'
      AND lower(p.email) = v_email
  ) THEN
    RAISE EXCEPTION 'already_member: % is already a School Admin here', v_email
      USING ERRCODE = 'unique_violation';
  END IF;

  -- 5. Already has an open School Admin invite here: refuse, use Resend instead.
  IF EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.tenant_id = p_tenant_id AND i.role = 'school_admin' AND i.status = 'pending'
      AND lower(i.email) = v_email
  ) THEN
    RAISE EXCEPTION 'already_invited: % already has an open invite', v_email
      USING ERRCODE = 'unique_violation';
  END IF;

  -- 6. Create it. invited_by stays NULL: a Platform Admin has no profile. Who sent it is
  --    in the audit row. Two clicks at the same moment: the unique index
  --    invitations_one_pending_email (0008) lets only one through.
  BEGIN
    INSERT INTO public.invitations (tenant_id, email, role, invited_by, token_hash)
    VALUES (p_tenant_id, v_email, 'school_admin', NULL, p_token_hash)
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'already_invited: % already has an open invite', v_email
      USING ERRCODE = 'unique_violation';
  END;

  -- 7. The audit row, in the same transaction.
  INSERT INTO public.audit_log (actor_id, actor_kind, tenant_id, action, resource_type, resource_id, details)
  VALUES (p_actor_id, 'platform_admin', p_tenant_id, 'invite.create', 'invitation', v_id,
          jsonb_build_object('role', 'school_admin', 'email', v_email));

  RETURN QUERY SELECT v_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.create_school_admin_invitation(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_school_admin_invitation(uuid, text, uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. create_school_invitation() from 0019, with one new check at the top:
--    role school_admin is refused (US-036.3). Everything else is exactly as in 0019.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_school_invitation(
  p_tenant_id uuid,
  p_email text,
  p_role text,
  p_invited_by uuid,
  p_token_hash text
)
RETURNS TABLE (invitation_id uuid, reused boolean)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_role public.user_role;
  v_status public.subscription_status;
  v_id uuid;
BEGIN
  -- 0. New in 0020: only a Platform Admin invites School Admins (create_school_admin_invitation).
  IF p_role = 'school_admin' THEN
    RAISE EXCEPTION 'platform_admin_only: only a Platform Admin can invite a School Admin'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 1. Who is inviting: an active School Admin of THIS school, nobody else.
  IF p_invited_by IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.profiles p ON p.id = m.profile_id AND p.tenant_id = m.tenant_id
    WHERE m.profile_id = p_invited_by AND m.tenant_id = p_tenant_id
      AND m.role = 'school_admin' AND m.status = 'active' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_school_admin: only an active School Admin of this school can invite'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. The input (same rules as upsert_invitation in 0018).
  IF coalesce(v_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email) > 320 THEN
    RAISE EXCEPTION 'invalid_email: a valid email is required' USING ERRCODE = 'check_violation';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('teacher', 'student', 'parent') THEN
    RAISE EXCEPTION 'invalid_role: %', p_role USING ERRCODE = 'check_violation';
  END IF;
  v_role := p_role::public.user_role;
  IF coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid_token_hash' USING ERRCODE = 'check_violation';
  END IF;

  -- 3. The school must be open.
  SELECT t.subscription_status INTO v_status FROM public.tenants t WHERE t.id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'school_not_found: %', p_tenant_id USING ERRCODE = 'no_data_found';
  END IF;
  IF v_status IN ('suspended', 'cancelled') THEN
    RAISE EXCEPTION 'school_%', v_status::text USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 4. Already has this role here: no invite needed.
  IF EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.profiles p ON p.id = m.profile_id AND p.tenant_id = m.tenant_id
    WHERE m.tenant_id = p_tenant_id AND m.role = v_role AND m.status <> 'removed'
      AND lower(p.email) = v_email
  ) THEN
    RAISE EXCEPTION 'already_member: % already has this role', v_email USING ERRCODE = 'unique_violation';
  END IF;

  -- 5. Already has an open invite: refuse, the admin uses Resend instead.
  IF EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.tenant_id = p_tenant_id AND i.role = v_role AND i.status = 'pending'
      AND lower(i.email) = v_email
  ) THEN
    RAISE EXCEPTION 'already_invited: % already has an open invite', v_email USING ERRCODE = 'unique_violation';
  END IF;

  -- 6. Create it.
  BEGIN
    INSERT INTO public.invitations (tenant_id, email, role, invited_by, token_hash)
    VALUES (p_tenant_id, v_email, v_role, p_invited_by, p_token_hash)
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'already_invited: % already has an open invite', v_email USING ERRCODE = 'unique_violation';
  END;

  RETURN QUERY SELECT v_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.create_school_invitation(uuid, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_school_invitation(uuid, text, text, uuid, text) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
