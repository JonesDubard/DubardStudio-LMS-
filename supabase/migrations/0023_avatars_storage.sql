
-- 0023: profile permissions and photos in storage (US-005.2 / US-005.3)
--
-- Profile permissions:
--   1. Signed-in users can update only full_name, phone and photo_file_id.
--   2. Email, status, tenant_id, student_number and id cannot be changed.
--
-- Avatar storage:
--   3. Users can upload only into their own avatars folder and school.
--   4. A RESTRICTIVE policy prevents uploads into another user's avatar folder.
--   5. Everyone in the school can read school avatars.
--   6. Users can create only their own school's avatar file rows.
--   7. Everyone in the school can read school avatar file rows.
--
-- Avatar path:
--     {tenant_id}/avatars/{user_id}/{file_id}-{name}
--
-- Images only, at most 2 MB. The NF-03 upload helper checks the file type
-- and size. These policies provide additional database-level protection.
--
-- Profile photo visibility: everyone in the school.
--
-- Safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Profile column-level UPDATE permissions (US-005.2)
-- ---------------------------------------------------------------------------

-- Remove table-level UPDATE permissions.
REVOKE UPDATE ON public.profiles
FROM authenticated, anon;

-- Remove the previously granted email UPDATE permission.
REVOKE UPDATE (email)
ON public.profiles
FROM authenticated;

-- Grant only the permitted profile columns.
GRANT UPDATE (full_name, phone, photo_file_id)
ON public.profiles
TO authenticated;


-- ---------------------------------------------------------------------------
-- 2. Users can upload only their own profile photo (US-005.3)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;

CREATE POLICY avatars_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-files'
    AND (storage.foldername(name))[1] = (SELECT auth.jwt() ->> 'tenant_id')
    AND (storage.foldername(name))[2] = 'avatars'
    AND (storage.foldername(name))[3] = (SELECT auth.uid())::text
  );


-- ---------------------------------------------------------------------------
-- 3. Prevent uploads into another user's avatar folder
--    RESTRICTIVE: applies regardless of other permissive policies.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS avatars_insert_only_own_folder ON storage.objects;

CREATE POLICY avatars_insert_only_own_folder ON storage.objects
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id <> 'tenant-files'
    OR (storage.foldername(name))[2] IS DISTINCT FROM 'avatars'
    OR (storage.foldername(name))[3] = (SELECT auth.uid())::text
  );


-- ---------------------------------------------------------------------------
-- 4. Read profile photos belonging to the same school
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS avatars_select_school ON storage.objects;

CREATE POLICY avatars_select_school ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-files'
    AND (storage.foldername(name))[1] = (SELECT auth.jwt() ->> 'tenant_id')
    AND (storage.foldername(name))[2] = 'avatars'
  );


-- ---------------------------------------------------------------------------
-- 5. Insert the files row for your own avatar
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS files_insert_own_avatar ON public.files;

CREATE POLICY files_insert_own_avatar ON public.files
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = ((SELECT auth.jwt() ->> 'tenant_id'))::uuid
    AND storage_path LIKE tenant_id::text || '/avatars/' || (SELECT auth.uid())::text || '/%'
    AND mime_type LIKE 'image/%'
  );


-- ---------------------------------------------------------------------------
-- 6. Read avatar file rows belonging to the same school
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS files_select_school_avatars ON public.files;

CREATE POLICY files_select_school_avatars ON public.files
  FOR SELECT TO authenticated
  USING (
    tenant_id = ((SELECT auth.jwt() ->> 'tenant_id'))::uuid
    AND storage_path LIKE tenant_id::text || '/avatars/%'
  );


-- ---------------------------------------------------------------------------
-- 7. Refresh PostgREST schema cache
-- ---------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';

COMMIT;
