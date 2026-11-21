-- 0016: accept an invitation (US-001)
--   1. invitation_token_hash()  how a link token is stored: sha256, hex
--   2. check_invitation()       look a link up before an account is made (no writes)
--   3. accept_invitation()      add the person to the school and mark the invite used
--
-- Invitations come from 0008. Only a hash of each link's token is stored, so both
-- functions take the token from the link and hash it here, in one place.
--
-- The accept-invite server action (app/(auth)/invite/actions.ts) calls these with
-- createAdminClient(), in this order:
--   check_invitation() -> create the auth user (Auth API) -> accept_invitation()
-- The Auth API call can't join this transaction, so if accept_invitation() refuses,
-- the server action deletes the auth user it just made.
--
-- accept_invitation() checks everything again with the invite row locked, so it is
-- the one that counts. In one transaction it:
--   - refuses an unknown, used, revoked or expired link, or a suspended or cancelled
--     school (US-001.2, US-001.3). The login hook can't do this here, because a new
--     user has no membership yet.
--   - creates the profile, or reuses it when the same person already belongs to this
--     school (a second role); refuses a person who belongs to another school
--   - adds the membership with the invite's school and role
--   - marks the invite accepted
--   - writes an audit row (invite.accept)
--
-- Error codes (the start of each error message):
--   invite_unknown, invite_used, invite_revoked, invite_expired, invite_no_email,
--   school_suspended, school_cancelled, wrong_school, already_member,
--   account_not_active, invalid_name
--
-- Both run as the caller (no SECURITY DEFINER) and only the service role may call
-- them, like provision_tenant() in 0010 and the 0015 functions.
--
-- Safe to re-run.
 
BEGIN;
 
-- ---------------------------------------------------------------------------
-- 1. invitation_token_hash(): the token in the link -> invitations.token_hash
-- ---------------------------------------------------------------------------
 
CREATE OR REPLACE FUNCTION public.invitation_token_hash(p_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
$$;
 
-- ---------------------------------------------------------------------------
-- 2. check_invitation(): what the invite page needs, and whether it can be used.
--    (school_subdomain lets the page send people to their school's address.)
--    problem is null when the link can be accepted, otherwise one of the error
--    codes above. Unknown links return one row with only problem set, so the
--    caller never learns anything about other schools' invites.
-- ---------------------------------------------------------------------------
 
CREATE OR REPLACE FUNCTION public.check_invitation(p_token text)
RETURNS TABLE (
  invitation_id uuid,
  tenant_id uuid,
  school_name text,
  school_subdomain text,
  email text,
  role text,
  problem text
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_inv    public.invitations%ROWTYPE;
  v_school public.tenants%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) NOT BETWEEN 20 AND 200 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, 'invite_unknown'::text;
    RETURN;
  END IF;
 
  SELECT * INTO v_inv FROM public.invitations i
  WHERE i.token_hash = public.invitation_token_hash(p_token);
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, 'invite_unknown'::text;
    RETURN;
  END IF;
 
  SELECT * INTO v_school FROM public.tenants t WHERE t.id = v_inv.tenant_id;
 
  RETURN QUERY SELECT
    v_inv.id, v_inv.tenant_id, v_school.name, v_school.subdomain, v_inv.email, v_inv.role::text,
    CASE
      WHEN v_inv.status = 'accepted' THEN 'invite_used'
      WHEN v_inv.status = 'revoked' THEN 'invite_revoked'
      WHEN v_inv.status = 'expired' OR v_inv.expires_at <= now() THEN 'invite_expired'
      WHEN v_school.subscription_status IN ('suspended', 'cancelled')
        THEN 'school_' || v_school.subscription_status::text
      WHEN v_inv.email IS NULL THEN 'invite_no_email'
      ELSE NULL
    END;
END;
$$;
 
-- ---------------------------------------------------------------------------
-- 3. accept_invitation()
--    p_user_id: the auth user who accepts (just created, or already signed in).
--    p_full_name: used only when a new profile is made.
--    Returns the school and role, for the server action's reply.
-- ---------------------------------------------------------------------------
 
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_token text,
  p_user_id uuid,
  p_full_name text
)
RETURNS TABLE (tenant_id uuid, role text)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_inv     public.invitations%ROWTYPE;
  v_status  public.subscription_status;
  v_profile public.profiles%ROWTYPE;
  v_name    text := btrim(coalesce(p_full_name, ''));
  v_new_profile boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invite_unknown: no user' USING ERRCODE = 'invalid_parameter_value';
  END IF;
 
  IF p_token IS NULL OR length(p_token) NOT BETWEEN 20 AND 200 THEN
    RAISE EXCEPTION 'invite_unknown' USING ERRCODE = 'no_data_found';
  END IF;
 
  -- FOR UPDATE: two tabs accepting the same link at once are handled one after the
  -- other; the second sees status = accepted and gets invite_used.
  SELECT * INTO v_inv FROM public.invitations i
  WHERE i.token_hash = public.invitation_token_hash(p_token)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite_unknown' USING ERRCODE = 'no_data_found';
  END IF;
 
  IF v_inv.status = 'accepted' THEN
    RAISE EXCEPTION 'invite_used' USING ERRCODE = 'check_violation';
  ELSIF v_inv.status = 'revoked' THEN
    RAISE EXCEPTION 'invite_revoked' USING ERRCODE = 'check_violation';
  ELSIF v_inv.status = 'expired' OR v_inv.expires_at <= now() THEN
    RAISE EXCEPTION 'invite_expired' USING ERRCODE = 'check_violation';
  END IF;
 
  -- FOR SHARE: the school can't be suspended halfway through this acceptance.
  SELECT t.subscription_status INTO v_status
  FROM public.tenants t WHERE t.id = v_inv.tenant_id
  FOR SHARE;
  IF v_status IN ('suspended', 'cancelled') THEN
    RAISE EXCEPTION 'school_%', v_status::text USING ERRCODE = 'insufficient_privilege';
  END IF;
 
  IF v_inv.email IS NULL THEN
    RAISE EXCEPTION 'invite_no_email: phone-only invites are accepted another way'
      USING ERRCODE = 'check_violation';
  END IF;
 
  -- A profile belongs to one school (profiles.id is the auth user id).
  SELECT * INTO v_profile FROM public.profiles p WHERE p.id = p_user_id FOR UPDATE;
  IF FOUND THEN
    IF v_profile.tenant_id <> v_inv.tenant_id THEN
      RAISE EXCEPTION 'wrong_school: this account belongs to another school'
        USING ERRCODE = 'check_violation';
    END IF;
    IF v_profile.status <> 'active' THEN
      RAISE EXCEPTION 'account_not_active' USING ERRCODE = 'check_violation';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.memberships m WHERE m.profile_id = p_user_id AND m.role = v_inv.role
    ) THEN
      RAISE EXCEPTION 'already_member: this account already has that role'
        USING ERRCODE = 'unique_violation';
    END IF;
  ELSE
    IF v_name = '' OR length(v_name) > 200 THEN
      RAISE EXCEPTION 'invalid_name: enter your full name (up to 200 characters)'
        USING ERRCODE = 'check_violation';
    END IF;
    INSERT INTO public.profiles (id, tenant_id, full_name, email, status)
    VALUES (p_user_id, v_inv.tenant_id, v_name, lower(btrim(v_inv.email)), 'active');
    v_new_profile := true;
  END IF;
 
  INSERT INTO public.memberships (tenant_id, profile_id, role, status)
  VALUES (v_inv.tenant_id, p_user_id, v_inv.role, 'active');
 
  UPDATE public.invitations
  SET status = 'accepted', accepted_user_id = p_user_id
  WHERE id = v_inv.id;
 
  INSERT INTO public.audit_log (actor_id, actor_kind, tenant_id, action, resource_type, resource_id, details)
  VALUES (p_user_id, 'user', v_inv.tenant_id, 'invite.accept', 'invitation', v_inv.id,
          jsonb_build_object('role', v_inv.role::text, 'new_profile', v_new_profile));
 
  RETURN QUERY SELECT v_inv.tenant_id, v_inv.role::text;
END;
$$;
 
REVOKE ALL ON FUNCTION public.invitation_token_hash(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_invitation(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_invitation(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invitation_token_hash(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_invitation(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text, uuid, text) TO service_role;
 
COMMIT;
 
NOTIFY pgrst, 'reload schema';
 