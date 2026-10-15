-- Central files table and lesson_materials.file_id (ERD v3).
-- lesson_materials.storage_path is removed. Uploaded bytes are described
-- by public.files. External videos still use lesson_materials.external_url.
--
-- Numbered 0005a because 0005 was reserved for the broader people + files
-- batch. Memberships and enrollments land later as 0005b.
--

-- ---------------------------------------------------------------------------
-- files
-- storage_path pattern: /{tenant_id}/{type}/{id}/{file}
-- scan_status: pending, clean, or blocked.
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

CREATE INDEX IF NOT EXISTS files_tenant_id_idx
  ON public.files (tenant_id);

CREATE INDEX IF NOT EXISTS files_tenant_id_created_at_idx
  ON public.files (tenant_id, created_at DESC);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.files;
CREATE POLICY tenant_isolation ON public.files
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

REVOKE ALL ON TABLE public.files FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.files
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- lesson_materials.file_id
-- Existing uploaded rows are copied into files before storage_path drops.
-- External rows (external_url set, storage_path null) are left alone.
-- ---------------------------------------------------------------------------

ALTER TABLE public.lesson_materials
  ADD COLUMN IF NOT EXISTS file_id uuid;

DO $$
BEGIN
  ALTER TABLE public.lesson_materials
    ADD CONSTRAINT lesson_materials_file_id_fkey
    FOREIGN KEY (file_id) REFERENCES public.files (id) ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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
      tenant_id,
      storage_path,
      original_name,
      mime_type,
      size_bytes
    )
    SELECT
      lm.tenant_id,
      lm.storage_path,
      regexp_replace(lm.storage_path, '^.*/', ''),
      COALESCE(lm.mime_type, 'application/octet-stream'),
      COALESCE(lm.file_size, 0)
    FROM public.lesson_materials AS lm
    WHERE lm.storage_path IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.files AS existing
        WHERE existing.tenant_id = lm.tenant_id
          AND existing.storage_path = lm.storage_path
      );

    UPDATE public.lesson_materials AS lm
    SET file_id = f.id
    FROM public.files AS f
    WHERE lm.storage_path IS NOT NULL
      AND lm.file_id IS NULL
      AND f.tenant_id = lm.tenant_id
      AND f.storage_path = lm.storage_path;
  END IF;
END $$;

ALTER TABLE public.lesson_materials
  DROP CONSTRAINT IF EXISTS lesson_materials_one_source;

ALTER TABLE public.lesson_materials
  DROP CONSTRAINT IF EXISTS lesson_materials_mime_allowlist;

ALTER TABLE public.lesson_materials
  DROP COLUMN IF EXISTS storage_path;

ALTER TABLE public.lesson_materials
  ADD CONSTRAINT lesson_materials_one_source CHECK (
    (file_id IS NOT NULL AND external_url IS NULL)
    OR (file_id IS NULL AND external_url IS NOT NULL)
  );

NOTIFY pgrst, 'reload schema';
