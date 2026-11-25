-- 0021: remove a School Admin, always with an audit row (US-037)
--   1. remove_school_admin()   sets one School Admin membership of one school to removed,
--                              with an audit row, or refuses with a clear code.
--                              The actor is a Platform Admin (US-037), or an active School Admin
--                              of the same school (they keep the Remove button they had).
--   2. School Admin memberships can only be changed by the server
--                              a signed-in School Admin can no longer add, change or delete a
--                              school_admin membership directly (RLS used to allow it). So every
--                              removal goes through remove_school_admin() and is audited, and
--                              adding a School Admin stays Platform-only (US-036).
--
-- What "removed" does:
--   Only the school_admin membership changes. The profile stays (it is still linked to
--   lessons, grades and the audit log), and any other role the person has at this school
--   (for example teacher) is kept.
--   The login hook (0010) only reads ACTIVE memberships, so on the person's next login or
--   token refresh their token no longer says school_admin. If they had no other role, the
--   token has no school and no roles at all and RLS denies everything. Tokens last 1 hour
--   (jwt_expiry in config.toml), so access is gone within the token lifetime (US-037.2).
--
-- The last School Admin of a school can't be removed: the trigger
-- memberships_last_admin_guard (0005) refuses it, and this function turns that into the
-- code last_school_admin.
--
-- The change and its audit row are saved in one transaction, like 0015 and 0020.
-- Audit action: membership.remove, resource membership, details {role, profile_id, email}.
-- actor_kind is platform_admin or user (a School Admin), so the log shows who did it.
--
-- Error messages start with a code (the app maps them to plain sentences):
--   not_allowed, admin_not_found, last_school_admin
-- Safe to re-run. Needs 0005, 0010.

BEGIN;

CREATE OR REPLACE FUNCTION public.remove_school_admin(
  p_tenant_id uuid,
  p_profile_id uuid,
  p_actor_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_membership uuid;
  v_email text;
  v_actor_kind text;
BEGIN
  -- 1. Who is removing: an active Platform Admin, or an active School Admin of THIS school.
  IF EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.id = p_actor_id AND pa.is_active
  ) THEN
    v_actor_kind := 'platform_admin';
  ELSIF EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.profiles p ON p.id = m.profile_id AND p.tenant_id = m.tenant_id
    WHERE m.profile_id = p_actor_id AND m.tenant_id = p_tenant_id
      AND m.role = 'school_admin' AND m.status = 'active' AND p.status = 'active'
  ) THEN
    v_actor_kind := 'user';
  ELSE
    RAISE EXCEPTION 'not_allowed: only a Platform Admin or an active School Admin of this school can remove a School Admin'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. The School Admin membership, in THIS school only. FOR UPDATE: two clicks at once
  --    are handled one after the other; the second finds nothing and gets admin_not_found.
  SELECT m.id, p.email INTO v_membership, v_email
  FROM public.memberships m
  JOIN public.profiles p ON p.id = m.profile_id AND p.tenant_id = m.tenant_id
  WHERE m.tenant_id = p_tenant_id AND m.profile_id = p_profile_id
    AND m.role = 'school_admin' AND m.status <> 'removed'
  FOR UPDATE OF m;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'admin_not_found: no School Admin % in school %', p_profile_id, p_tenant_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- 3. Remove it. The 0005 trigger refuses if this is the last active School Admin.
  BEGIN
    UPDATE public.memberships SET status = 'removed' WHERE id = v_membership;
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'last_school_admin: a school needs at least one active School Admin'
      USING ERRCODE = 'check_violation';
  END;

  -- 4. The audit row, in the same transaction.
  INSERT INTO public.audit_log (actor_id, actor_kind, tenant_id, action, resource_type, resource_id, details)
  VALUES (p_actor_id, v_actor_kind, p_tenant_id, 'membership.remove', 'membership', v_membership,
          jsonb_build_object('role', 'school_admin', 'profile_id', p_profile_id, 'email', v_email));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_school_admin(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_school_admin(uuid, uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Only the server changes School Admin memberships
--    RLS (memberships_admin_all, 0005) lets a School Admin write memberships of their school,
--    which they still need for teachers, students and parents. This trigger adds one rule
--    on top: a row whose role is (or becomes) school_admin can't be added, changed or
--    deleted by a signed-in School Admin directly. The server (service role: accept_invitation,
--    remove_school_admin) and migrations or seeds (postgres) are not affected.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_school_admin_membership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Only a signed-in School Admin can write memberships at all (RLS), so that is who this
  -- checks. Everyone else is still refused by RLS, with its own message.
  IF current_user = 'authenticated' AND public.jwt_has_role('school_admin')
     AND ((TG_OP <> 'INSERT' AND OLD.role = 'school_admin')
          OR (TG_OP <> 'DELETE' AND NEW.role = 'school_admin')) THEN
    RAISE EXCEPTION 'server_only: School Admin memberships are changed through the app, so each change is audited'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_school_admin_membership() FROM PUBLIC;

DROP TRIGGER IF EXISTS memberships_school_admin_server_only ON public.memberships;
CREATE TRIGGER memberships_school_admin_server_only
  BEFORE INSERT OR UPDATE OR DELETE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.guard_school_admin_membership();

NOTIFY pgrst, 'reload schema';

COMMIT;
