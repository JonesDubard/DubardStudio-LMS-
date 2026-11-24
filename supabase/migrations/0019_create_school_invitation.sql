-- 0019: a School Admin invites someone new to their school (US-030)
--   create_school_invitation()   makes ONE new invitation, or refuses with a clear code.
--
-- How it differs from upsert_invitation() (0018):
--   upsert_invitation() is "create or reuse": a second call is a resend (same row, new link).
--   create_school_invitation() is "create only": if the person already has an open invite
--   it refuses with already_invited and sends nothing. Resend stays a separate, explicit
--   action (it goes through upsert_invitation()).
--
-- It also checks the inviter in the database, not only in the app: p_invited_by must be an
-- ACTIVE School Admin of p_tenant_id. So a teacher, a parent, a removed admin, or another
-- school's admin is refused even if the app code had a bug or a stale sign-in token.
--
-- Error messages start with a code (the app maps them to plain sentences):
--   not_school_admin, invalid_email, invalid_role, invalid_token_hash, school_not_found,
--   school_suspended, school_cancelled, already_member, already_invited
--
-- Used by lib/invitations/sendInvite.ts (newOnly: true) through the service role.
-- Returns the same shape as upsert_invitation() so sendInvite() handles both.
-- Safe to re-run. Needs 0008 and 0018.

BEGIN;

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
  IF p_role IS NULL OR p_role NOT IN ('school_admin', 'teacher', 'student', 'parent') THEN
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
  --    (Also catches an open invite that has run out of time: Resend gives it 7 new days.)
  IF EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.tenant_id = p_tenant_id AND i.role = v_role AND i.status = 'pending'
      AND lower(i.email) = v_email
  ) THEN
    RAISE EXCEPTION 'already_invited: % already has an open invite', v_email USING ERRCODE = 'unique_violation';
  END IF;

  -- 6. Create it. If two clicks arrive at the same moment, the unique index
  --    invitations_one_pending_email (0008) lets only one through; the other gets already_invited.
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
