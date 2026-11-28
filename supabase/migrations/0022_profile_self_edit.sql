-- 0022: users edit their own profile (US-005)
--   1. photo_file_id          the profile photo: a row in public.files (uploaded with the NF-03 helper)
--   2. RLS policy             a user can update only their own profiles row (US-005.1)
--   3. Column grants          only full_name, phone and photo_file_id can be changed by a signed-in
--                             user; never tenant_id, status, email, student_number or id (US-005.2).
--                             This replaces whatever UPDATE rights the signed-in role had before
--                             (0011 granted email and not phone).
--   4. check_profile_photo()  the photo must be an image row of the user's own school, so a user can't
--                             point their profile at another school's file
--   5. sync_profile_email()   copies the confirmed email from auth.users to profiles (US-005.4).
--                             auth.users.email changes only after the user confirms the new address,
--                             so profiles.email follows Supabase Auth, never the other way round.
--
-- Roles live in memberships, not in profiles. Nothing here lets a user change a membership.
-- Changes to status, school or student number (a school admin deactivating someone, for example)
-- must go through a server function with the service role: signed-in users no longer have the right.
--
-- Safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Photo column. If the table already has a photo column under another name,
--    drop this part and use that name in the grant below.
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_file_id uuid REFERENCES public.files (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 2. Who: only your own row.
--    Other UPDATE policies on profiles are combined with this one (OR), so any older
--    policy that lets someone update other people's rows must be dropped or narrowed
--    in this migration. List them with:
--      select policyname, qual from pg_policies where tablename = 'profiles' and cmd in ('UPDATE','ALL');
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. Which columns. Revoking the table-level right also removes every column right,
--    so the grant below is the complete list.
-- ---------------------------------------------------------------------------

REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (full_name, phone, photo_file_id) ON public.profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. The photo must be an image in the user's own school.
--    (Tighten to "uploaded by this user" once the helper has an avatars upload type
--    with a per-user folder, as submissions have.)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_profile_photo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.photo_file_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.files f
    WHERE f.id = NEW.photo_file_id
      AND f.tenant_id = NEW.tenant_id
      AND f.mime_type LIKE 'image/%'
  ) THEN
    RAISE EXCEPTION 'invalid_photo: the photo must be an image in your own school'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_profile_photo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_check_photo ON public.profiles;
CREATE TRIGGER profiles_check_photo
  BEFORE UPDATE OF photo_file_id ON public.profiles
  FOR EACH ROW
  WHEN (NEW.photo_file_id IS NOT NULL AND NEW.photo_file_id IS DISTINCT FROM OLD.photo_file_id)
  EXECUTE FUNCTION public.check_profile_photo();

-- ---------------------------------------------------------------------------
-- 5. Email: Supabase Auth is the source, profiles.email is a copy.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET email = lower(btrim(NEW.email))
  WHERE id = NEW.id
    AND email IS DISTINCT FROM lower(btrim(NEW.email));
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_profile_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_profile_email ON auth.users;
CREATE TRIGGER sync_profile_email
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (NEW.email IS NOT NULL AND OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_profile_email();

NOTIFY pgrst, 'reload schema';

COMMIT;