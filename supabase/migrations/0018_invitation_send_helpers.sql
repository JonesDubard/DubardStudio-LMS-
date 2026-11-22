-- 0018: create-or-reuse an invitation, and record that its email went out (US-008b)
--   1. upsert_invitation()      one open invitation per school + email + role. A second call
--                               (a resend) reuses the row and gives it a new token and a fresh
--                               7 days; it never creates a second row.
--   2. mark_invitation_sent()   sets sent_at once the email service accepted the email
--
-- Why a new token on reuse: 0008 stores only a hash of the token, so the old link cannot be
-- rebuilt. A resend therefore replaces the token (the old link stops working) on the SAME
-- invitation. sent_at is cleared at that moment and set again only after a successful send,
-- so "sent_at empty" always means "the current link has not been emailed".
--
-- Used by lib/invitations/sendInvite.ts through the service role, for School Admin, teacher
-- and parent invites alike. The caller's right to invite is checked by the server code before
-- this runs. Safe to re-run. Needs 0008.

BEGIN;

CREATE OR REPLACE FUNCTION public.upsert_invitation(
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
BEGIN
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

  SELECT t.subscription_status INTO v_status FROM public.tenants t WHERE t.id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'school_not_found: %', p_tenant_id USING ERRCODE = 'no_data_found';
  END IF;
  IF v_status IN ('suspended', 'cancelled') THEN
    RAISE EXCEPTION 'school_%', v_status::text USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Someone who already has this role in this school does not need an invite.
  IF EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.profiles p ON p.id = m.profile_id AND p.tenant_id = m.tenant_id
    WHERE m.tenant_id = p_tenant_id AND m.role = v_role AND m.status <> 'removed'
      AND lower(p.email) = v_email
  ) THEN
    RAISE EXCEPTION 'already_member: % already has this role', v_email USING ERRCODE = 'unique_violation';
  END IF;

  -- One statement, so two calls at the same moment cannot make two rows
  -- (the partial unique index invitations_one_pending_email decides).
  RETURN QUERY
  INSERT INTO public.invitations AS i (tenant_id, email, role, invited_by, token_hash)
  VALUES (p_tenant_id, v_email, v_role, p_invited_by, p_token_hash)
  ON CONFLICT (tenant_id, lower(email), role) WHERE status = 'pending' AND email IS NOT NULL
  DO UPDATE SET token_hash = EXCLUDED.token_hash,
                expires_at = now() + interval '7 days',
                sent_at = NULL
  RETURNING i.id, (xmax <> 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_invitation_sent(p_invitation_id uuid, p_token_hash text)
RETURNS boolean
LANGUAGE sql
SET search_path = ''
AS $$
  -- Only if the invitation still carries the token that was emailed: a newer resend
  -- must not be marked as sent by an older, slower call.
  WITH upd AS (
    UPDATE public.invitations
    SET sent_at = now()
    WHERE id = p_invitation_id AND status = 'pending' AND token_hash = p_token_hash
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM upd)
$$;

REVOKE ALL ON FUNCTION public.upsert_invitation(uuid, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_invitation_sent(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_invitation(uuid, text, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_invitation_sent(uuid, text) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;