-- Academic structure for School Admin setup (docs/data-model.md §5).
-- Years, terms, classes, subjects, and class-subject links.
-- Every table is tenant-scoped. RLS reads the JWT tenant_id claim.
--
-- Apply in the Supabase SQL editor after 0001_custom_access_token_hook.sql.

-- ---------------------------------------------------------------------------
-- academic_years
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academic_years_tenant_id_idx
  ON public.academic_years (tenant_id);

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.academic_years;
CREATE POLICY tenant_isolation ON public.academic_years
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

REVOKE ALL ON TABLE public.academic_years FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.academic_years
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- terms
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years (id),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS terms_tenant_id_idx
  ON public.terms (tenant_id);

CREATE INDEX IF NOT EXISTS terms_academic_year_id_idx
  ON public.terms (academic_year_id);

ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.terms;
CREATE POLICY tenant_isolation ON public.terms
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

REVOKE ALL ON TABLE public.terms FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.terms
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- classes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  name text NOT NULL,
  grade_level text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classes_tenant_id_idx
  ON public.classes (tenant_id);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.classes;
CREATE POLICY tenant_isolation ON public.classes
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

REVOKE ALL ON TABLE public.classes FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.classes
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subjects_tenant_id_idx
  ON public.subjects (tenant_id);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.subjects;
CREATE POLICY tenant_isolation ON public.subjects
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

REVOKE ALL ON TABLE public.subjects FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subjects
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- class_subjects
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.class_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  class_id uuid NOT NULL REFERENCES public.classes (id),
  subject_id uuid NOT NULL REFERENCES public.subjects (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, subject_id)
);

CREATE INDEX IF NOT EXISTS class_subjects_tenant_id_idx
  ON public.class_subjects (tenant_id);

ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.class_subjects;
CREATE POLICY tenant_isolation ON public.class_subjects
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

REVOKE ALL ON TABLE public.class_subjects FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.class_subjects
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
