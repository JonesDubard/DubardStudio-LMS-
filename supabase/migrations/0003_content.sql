-- Content tables for Teacher lesson creation (docs/data-model.md §5).
-- Courses, lessons, lesson materials, and gradebook categories.
-- Every table is tenant-scoped. RLS reads the JWT tenant_id claim.
--

-- ---------------------------------------------------------------------------
-- lesson_status
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  CREATE TYPE public.lesson_status AS ENUM (
    'draft',
    'published',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- courses
-- name is nullable per docs/data-model.md §5.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  class_subject_id uuid NOT NULL REFERENCES public.class_subjects (id),
  term_id uuid NOT NULL REFERENCES public.terms (id),
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS courses_tenant_id_idx
  ON public.courses (tenant_id);

CREATE INDEX IF NOT EXISTS courses_class_subject_id_idx
  ON public.courses (class_subject_id);

CREATE INDEX IF NOT EXISTS courses_term_id_idx
  ON public.courses (term_id);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.courses;
CREATE POLICY tenant_isolation ON public.courses
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

REVOKE ALL ON TABLE public.courses FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.courses
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- lessons
-- status defaults to draft per docs/data-model.md §4 and §5.
-- No updated_at trigger: the data model does not specify one.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  course_id uuid NOT NULL REFERENCES public.courses (id),
  title text NOT NULL,
  description text,
  status public.lesson_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lessons_tenant_id_idx
  ON public.lessons (tenant_id);

CREATE INDEX IF NOT EXISTS lessons_course_id_idx
  ON public.lessons (course_id);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.lessons;
CREATE POLICY tenant_isolation ON public.lessons
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

REVOKE ALL ON TABLE public.lessons FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lessons
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- lesson_materials
-- kind values from the data model: pdf, doc, image, external_video.
-- Stored as text, not an enum. Exactly one of storage_path or external_url.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lesson_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  lesson_id uuid NOT NULL REFERENCES public.lessons (id),
  kind text NOT NULL,
  storage_path text,
  external_url text,
  file_size bigint,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_materials_one_source CHECK (
    (storage_path IS NOT NULL AND external_url IS NULL)
    OR (storage_path IS NULL AND external_url IS NOT NULL)
  ),
  CONSTRAINT lesson_materials_mime_allowlist CHECK (
    storage_path IS NULL
    OR (
      mime_type IS NOT NULL
      AND mime_type IN (
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp'
      )
    )
  )
);

CREATE INDEX IF NOT EXISTS lesson_materials_tenant_id_idx
  ON public.lesson_materials (tenant_id);

CREATE INDEX IF NOT EXISTS lesson_materials_lesson_id_idx
  ON public.lesson_materials (lesson_id);

ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.lesson_materials;
CREATE POLICY tenant_isolation ON public.lesson_materials
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

REVOKE ALL ON TABLE public.lesson_materials FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_materials
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- gradebook_categories
-- display_order defaults to 0 per docs/data-model.md §5.
-- Weights summing to 100 is an application rule, not a database constraint.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gradebook_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  course_id uuid NOT NULL REFERENCES public.courses (id),
  name text NOT NULL,
  weight numeric(5,2),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, name)
);

CREATE INDEX IF NOT EXISTS gradebook_categories_tenant_id_idx
  ON public.gradebook_categories (tenant_id);

CREATE INDEX IF NOT EXISTS gradebook_categories_course_id_idx
  ON public.gradebook_categories (course_id);

ALTER TABLE public.gradebook_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.gradebook_categories;
CREATE POLICY tenant_isolation ON public.gradebook_categories
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

REVOKE ALL ON TABLE public.gradebook_categories FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gradebook_categories
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
