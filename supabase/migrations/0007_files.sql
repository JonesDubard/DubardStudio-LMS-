-- 0007: central files table, lesson_materials -> files, storage bucket + policies.
-- Renamed from 0005a (the Supabase CLI skips file names with letters).
-- Safe to re-run: every step checks whether it has already been done.
--
-- Storage path pattern: {tenant_id}/{type}/{id}/{file}
-- No leading slash: the first folder must be the school's id, and the
-- storage policies below check exactly that.
-- scan_status: pending, clean, or blocked (set by the server, not by users).
-- ERD rev 3 does not list scan_status values. These match data-model.md and
-- Jones's 0005a, and cover NFR-6.5.5 (not checked yet / passed / failed).
-- NF-07b decides scanning for the pilot and may add a 'skipped' state.

-- ---------------------------------------------------------------------------
-- files
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  storage_path text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  variant_paths jsonb,
  scan_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT files_scan_status_check CHECK (
    scan_status IN ('pending', 'clean', 'blocked')
  )
);

-- lesson_materials.file_id is added here because the files policies below use it.
ALTER TABLE public.lesson_materials
  ADD COLUMN IF NOT EXISTS file_id uuid;

-- Who uploaded it: teachers may delete only their own uploads.
-- Note: uploaded_by is not in ERD rev 3 or data-model.md. It comes from our
-- planning schema (20261012000000_initial_schema.sql, marked "ADDED") and is
-- needed for the permission matrix rule "teachers delete only their own uploads".
-- Null for rows created by the server (service role) or backfilled below.
ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS uploaded_by uuid DEFAULT auth.uid();

-- The uploader must be a profile in the same school.
DO $$
BEGIN
  ALTER TABLE public.files
    ADD CONSTRAINT files_uploaded_by_tenant_fkey
    FOREIGN KEY (uploaded_by, tenant_id)
    REFERENCES public.profiles (id, tenant_id) ON DELETE SET NULL (uploaded_by);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- (id, tenant_id) lets other tables point at a file AND its school,
-- so a row can never link to another school's file.
DO $$
BEGIN
  ALTER TABLE public.files
    ADD CONSTRAINT files_id_tenant_id_key UNIQUE (id, tenant_id);
EXCEPTION
  WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;

-- The file must sit in its own school's folder.
DO $$
BEGIN
  ALTER TABLE public.files
    ADD CONSTRAINT files_storage_path_in_tenant_folder
    CHECK (storage_path LIKE tenant_id::text || '/%');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS files_storage_path_key
  ON public.files (storage_path);

CREATE INDEX IF NOT EXISTS files_tenant_id_created_at_idx
  ON public.files (tenant_id, created_at DESC);

DROP INDEX IF EXISTS public.files_tenant_id_idx;  -- covered by the index above

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.files;
CREATE POLICY tenant_isolation ON public.files
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.jwt_tenant_id()));

DROP POLICY IF EXISTS files_admin_all ON public.files;
CREATE POLICY files_admin_all ON public.files
  FOR ALL TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')));

DROP POLICY IF EXISTS files_teacher_read ON public.files;
CREATE POLICY files_teacher_read ON public.files
  FOR SELECT TO authenticated
  USING ((SELECT public.jwt_has_role('teacher')));

DROP POLICY IF EXISTS files_teacher_insert ON public.files;
CREATE POLICY files_teacher_insert ON public.files
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.jwt_has_role('teacher'))
    AND uploaded_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS files_teacher_update_own ON public.files;
CREATE POLICY files_teacher_update_own ON public.files
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND uploaded_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS files_teacher_delete_own ON public.files;
CREATE POLICY files_teacher_delete_own ON public.files
  FOR DELETE TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND uploaded_by = (SELECT auth.uid())
  );

-- Students and parents see a file only if they can see a lesson material
-- that uses it. lesson_materials' own RLS (published lessons only) applies
-- inside this subquery. 0008 narrows it to their classes; 0009 adds
-- student uploads for submissions.
DROP POLICY IF EXISTS files_learner_read ON public.files;
CREATE POLICY files_learner_read ON public.files
  FOR SELECT TO authenticated
  USING (
    ((SELECT public.jwt_has_role('student')) OR (SELECT public.jwt_has_role('parent')))
    AND EXISTS (
      SELECT 1 FROM public.lesson_materials lm WHERE lm.file_id = files.id
    )
  );

REVOKE ALL ON TABLE public.files FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.files TO authenticated;
-- Users may only rename a file. Path, type, size and scan_status are server-set.
REVOKE UPDATE ON TABLE public.files FROM authenticated;
GRANT UPDATE (original_name) ON TABLE public.files TO authenticated;
GRANT ALL ON TABLE public.files TO service_role;

-- ---------------------------------------------------------------------------
-- lesson_materials -> files
-- Existing uploaded rows are copied into files before the old columns drop.
-- External rows (external_url set, storage_path null) are left alone.
-- ---------------------------------------------------------------------------

ALTER TABLE public.lesson_materials
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lesson_materials'
      AND column_name = 'storage_path'
  ) THEN
    INSERT INTO public.files (
      tenant_id, storage_path, original_name, mime_type, size_bytes, uploaded_by
    )
    SELECT
      lm.tenant_id,
      ltrim(lm.storage_path, '/'),
      regexp_replace(lm.storage_path, '^.*/', ''),
      COALESCE(lm.mime_type, 'application/octet-stream'),
      COALESCE(lm.file_size, 0),
      NULL
    FROM public.lesson_materials AS lm
    WHERE lm.storage_path IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.files AS existing
        WHERE existing.storage_path = ltrim(lm.storage_path, '/')
      );

    UPDATE public.lesson_materials AS lm
    SET file_id = f.id
    FROM public.files AS f
    WHERE lm.storage_path IS NOT NULL
      AND lm.file_id IS NULL
      AND f.tenant_id = lm.tenant_id
      AND f.storage_path = ltrim(lm.storage_path, '/');
  END IF;
END $$;

-- Replace the plain file_id FK with one that also matches the school.
ALTER TABLE public.lesson_materials
  DROP CONSTRAINT IF EXISTS lesson_materials_file_id_fkey;

DO $$
BEGIN
  ALTER TABLE public.lesson_materials
    ADD CONSTRAINT lesson_materials_file_tenant_fkey
    FOREIGN KEY (file_id, tenant_id)
    REFERENCES public.files (id, tenant_id) ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS lesson_materials_file_id_idx
  ON public.lesson_materials (file_id);

ALTER TABLE public.lesson_materials
  DROP CONSTRAINT IF EXISTS lesson_materials_one_source;

ALTER TABLE public.lesson_materials
  DROP CONSTRAINT IF EXISTS lesson_materials_mime_allowlist;

-- Type and size now live on files.
ALTER TABLE public.lesson_materials
  DROP COLUMN IF EXISTS storage_path,
  DROP COLUMN IF EXISTS mime_type,
  DROP COLUMN IF EXISTS file_size;

ALTER TABLE public.lesson_materials
  ADD CONSTRAINT lesson_materials_one_source CHECK (
    (file_id IS NOT NULL AND external_url IS NULL)
    OR (file_id IS NULL AND external_url IS NOT NULL)
  );

-- ---------------------------------------------------------------------------
-- Storage: private bucket + policies (replaces scripts/setup-storage.ts) because it used things that have been changed in mig 005_membership
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-files', 'tenant-files', false, 10485760,  -- 10 MB
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Old hand-made policy from setup-storage.ts.
DROP POLICY IF EXISTS tenant_files_isolation ON storage.objects;

-- Read: own school's folder, and only objects the user can see in public.files
-- (so files RLS decides: staff see all, students/parents only published ones).
DROP POLICY IF EXISTS tenant_files_read ON storage.objects;
CREATE POLICY tenant_files_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-files'
    AND (storage.foldername(name))[1] = (SELECT public.jwt_tenant_id())::text
    AND EXISTS (SELECT 1 FROM public.files f WHERE f.storage_path = objects.name)
  );

-- Upload: School Admins and teachers, into their own school's folder only.
DROP POLICY IF EXISTS tenant_files_upload ON storage.objects;
CREATE POLICY tenant_files_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-files'
    AND (storage.foldername(name))[1] = (SELECT public.jwt_tenant_id())::text
    AND ((SELECT public.jwt_has_role('school_admin')) OR (SELECT public.jwt_has_role('teacher')))
  );

-- Delete: School Admins any file in their school; teachers only their own uploads.
DROP POLICY IF EXISTS tenant_files_delete ON storage.objects;
CREATE POLICY tenant_files_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-files'
    AND (storage.foldername(name))[1] = (SELECT public.jwt_tenant_id())::text
    AND (
      (SELECT public.jwt_has_role('school_admin'))
      OR ((SELECT public.jwt_has_role('teacher')) AND owner_id = (SELECT auth.uid())::text)
    )
  );
-- No UPDATE policy: files are never overwritten in place; upload a new one.

NOTIFY pgrst, 'reload schema';
