-- 0006: integrity on the existing tables + the columns the final ERD adds to them.
--
-- Part A  preflight          fails with ONE readable list if existing data would
--                            break a new rule (nothing is changed in that case).
-- Part B  new columns        tenants, platform_admins, terms, subjects, courses,
--                            lessons. Every new required column has a default or
--                            a trigger, so inserts from the current admin and
--                            teacher screens keep working.
-- Part C  rules              date checks, one current year/term, unique names,
--                            weight / kind / published checks.
-- Part D  cross-school FKs   (child_col, tenant_id) -> parent (id, tenant_id), so
--                            a row can never point into another school.
-- Part E  triggers           updated_at, terms.sequence, lessons.published_at and
--                            lessons.created_by.
-- Part F  helpers            set_current_academic_year(), set_current_term().
--
-- Needs 0005 applied first (checked below) and PostgreSQL 15+
-- (ON DELETE SET NULL (column)). Re-runnable.
-- Heads-up for the frontend: a second current year per school, or a second
-- current term per school, is now rejected, and a single UPDATE that flips both
-- rows is not reliable (the unique index is checked row by row). Call the helper
-- functions in Part F, or clear the old row first and set the new one second.
-- (That a current term belongs to the current year is an app rule, not enforced.)

BEGIN;

-- ===========================================================================
-- A. PREFLIGHT
-- ===========================================================================

-- A0. Things this migration relies on. updated_at must exist on every table that
--     gets the updated_at trigger, otherwise every later UPDATE on it would fail.
DO $$
DECLARE
  t text;
  missing text[] := '{}';
BEGIN
  FOREACH t IN ARRAY ARRAY['tenants', 'profiles', 'lessons'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'updated_at'
    ) THEN
      missing := missing || (t || '.updated_at');
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND indexname = 'profiles_id_tenant_id_key'
  ) THEN
    missing := missing || 'profiles unique (id, tenant_id)'::text;
  END IF;

  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION '0006 needs 0005 applied first. Missing: %', array_to_string(missing, ', ');
  END IF;
END $$;

-- A1. Existing data that would break a new rule.

DO $$
DECLARE
  problems text[] := '{}';
  n bigint;
  spec record;
BEGIN
  SELECT count(*) INTO n FROM public.academic_years WHERE end_date < start_date;
  IF n > 0 THEN problems := problems || format('academic_years: %s row(s) with end_date before start_date', n); END IF;

  SELECT count(*) INTO n FROM public.terms WHERE end_date < start_date;
  IF n > 0 THEN problems := problems || format('terms: %s row(s) with end_date before start_date', n); END IF;

  SELECT count(*) INTO n FROM (
    SELECT 1 FROM public.academic_years WHERE is_current GROUP BY tenant_id HAVING count(*) > 1
  ) d;
  IF n > 0 THEN problems := problems || format('academic_years: %s school(s) have more than one current year', n); END IF;

  SELECT count(*) INTO n FROM (
    SELECT 1 FROM public.terms WHERE is_current GROUP BY tenant_id HAVING count(*) > 1
  ) d;
  IF n > 0 THEN problems := problems || format('terms: %s school(s) have more than one current term', n); END IF;

  SELECT count(*) INTO n FROM (
    SELECT 1 FROM public.classes GROUP BY tenant_id, name HAVING count(*) > 1
  ) d;
  IF n > 0 THEN problems := problems || format('classes: %s duplicated name(s) within a school', n); END IF;

  SELECT count(*) INTO n FROM (
    SELECT 1 FROM public.subjects GROUP BY tenant_id, name HAVING count(*) > 1
  ) d;
  IF n > 0 THEN problems := problems || format('subjects: %s duplicated name(s) within a school', n); END IF;

  SELECT count(*) INTO n FROM (
    SELECT 1 FROM public.courses GROUP BY class_subject_id, term_id HAVING count(*) > 1
  ) d;
  IF n > 0 THEN problems := problems || format('courses: %s class-subject/term pair(s) have more than one course', n); END IF;

  SELECT count(*) INTO n FROM (
    SELECT 1 FROM public.tenants WHERE custom_domain IS NOT NULL
    GROUP BY lower(custom_domain) HAVING count(*) > 1
  ) d;
  IF n > 0 THEN problems := problems || format('tenants: %s duplicated custom_domain value(s)', n); END IF;

  SELECT count(*) INTO n FROM public.lesson_materials
  WHERE kind NOT IN ('pdf', 'doc', 'image', 'external_video')
     OR (kind = 'external_video') <> (external_url IS NOT NULL);
  IF n > 0 THEN problems := problems || format('lesson_materials: %s row(s) with an invalid kind, or kind not matching external_url', n); END IF;

  SELECT count(*) INTO n FROM public.gradebook_categories
  WHERE weight IS NOT NULL AND (weight < 0 OR weight > 100);
  IF n > 0 THEN problems := problems || format('gradebook_categories: %s row(s) with weight outside 0-100', n); END IF;

  FOR spec IN
    SELECT * FROM (VALUES
      ('terms', 'academic_year_id', 'academic_years'),
      ('class_subjects', 'class_id', 'classes'),
      ('class_subjects', 'subject_id', 'subjects'),
      ('courses', 'class_subject_id', 'class_subjects'),
      ('courses', 'term_id', 'terms'),
      ('lessons', 'course_id', 'courses'),
      ('lessons', 'created_by', 'profiles'),
      ('lesson_materials', 'lesson_id', 'lessons'),
      ('gradebook_categories', 'course_id', 'courses')
    ) AS v(child, col, parent)
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM public.%I c WHERE c.%I IS NOT NULL AND NOT EXISTS ('
      || 'SELECT 1 FROM public.%I p WHERE p.id = c.%I AND p.tenant_id = c.tenant_id)',
      spec.child, spec.col, spec.parent, spec.col) INTO n;
    IF n > 0 THEN
      problems := problems || format('%s.%s: %s row(s) point into another school', spec.child, spec.col, n);
    END IF;
  END LOOP;

  IF array_length(problems, 1) > 0 THEN
    RAISE EXCEPTION E'0006 preflight failed. Fix this data first, then re-run:\n - %',
      array_to_string(problems, E'\n - ');
  END IF;
END $$;

-- ===========================================================================
-- B. NEW COLUMNS
-- ===========================================================================

-- tenants ------------------------------------------------------------------

DO $$
BEGIN
  CREATE TYPE public.onboard_status AS ENUM (
    'provisioning', 'invited', 'branding_set', 'teachers_invited', 'first_lesson', 'complete'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Existing schools predate onboarding tracking, so they are backfilled as
-- 'complete'; schools created from now on start at 'provisioning'.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS plan_code text,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_status public.onboard_status NOT NULL DEFAULT 'complete',
  ADD COLUMN IF NOT EXISTS header_logo_url text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.platform_admins (id) ON DELETE SET NULL;

ALTER TABLE public.tenants ALTER COLUMN onboarding_status SET DEFAULT 'provisioning';

CREATE UNIQUE INDEX IF NOT EXISTS tenants_custom_domain_key
  ON public.tenants (lower(custom_domain)) WHERE custom_domain IS NOT NULL;

-- platform_admins ----------------------------------------------------------

ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.platform_admins pa
SET email = u.email
FROM auth.users u
WHERE u.id = pa.id AND pa.email IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.platform_admins WHERE email IS NULL) THEN
    RAISE EXCEPTION '0006: some platform_admins have no email in auth.users; set it first';
  END IF;
END $$;

ALTER TABLE public.platform_admins ALTER COLUMN email SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS platform_admins_email_key
  ON public.platform_admins (lower(email));

-- terms.sequence: order of the term inside its academic year ---------------

ALTER TABLE public.terms ADD COLUMN IF NOT EXISTS sequence integer;

UPDATE public.terms t
SET sequence = r.rn
FROM (
  SELECT id,
         row_number() OVER (PARTITION BY academic_year_id ORDER BY start_date, created_at, id) AS rn
  FROM public.terms
) r
WHERE t.id = r.id AND t.sequence IS NULL;

-- subjects / courses / lessons ----------------------------------------------

ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS code text;

-- courses.status reuses lesson_status (same values as the ERD's pub_status).
-- Existing courses become 'published' so nothing changes for them; courses
-- created from now on start as 'draft', like lessons.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status public.lesson_status NOT NULL DEFAULT 'published';

ALTER TABLE public.courses ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_reusable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS copied_from_lesson_id uuid;

-- Published lessons must carry a published_at (backfill before the CHECK).
UPDATE public.lessons
SET published_at = updated_at
WHERE status = 'published' AND published_at IS NULL;

-- ===========================================================================
-- C. RULES
-- ===========================================================================

ALTER TABLE public.academic_years DROP CONSTRAINT IF EXISTS academic_years_valid_date_range;
ALTER TABLE public.academic_years
  ADD CONSTRAINT academic_years_valid_date_range CHECK (end_date >= start_date);

ALTER TABLE public.terms DROP CONSTRAINT IF EXISTS terms_valid_date_range;
ALTER TABLE public.terms
  ADD CONSTRAINT terms_valid_date_range CHECK (end_date >= start_date);

ALTER TABLE public.terms ALTER COLUMN sequence SET NOT NULL;
ALTER TABLE public.terms DROP CONSTRAINT IF EXISTS terms_sequence_positive;
ALTER TABLE public.terms
  ADD CONSTRAINT terms_sequence_positive CHECK (sequence >= 1);

CREATE UNIQUE INDEX IF NOT EXISTS academic_years_one_current
  ON public.academic_years (tenant_id) WHERE is_current;

CREATE UNIQUE INDEX IF NOT EXISTS terms_one_current
  ON public.terms (tenant_id) WHERE is_current;

CREATE UNIQUE INDEX IF NOT EXISTS terms_year_sequence_key
  ON public.terms (academic_year_id, sequence);

CREATE UNIQUE INDEX IF NOT EXISTS classes_tenant_name_key
  ON public.classes (tenant_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS subjects_tenant_name_key
  ON public.subjects (tenant_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS courses_class_subject_term_key
  ON public.courses (class_subject_id, term_id);

CREATE INDEX IF NOT EXISTS class_subjects_subject_id_idx
  ON public.class_subjects (subject_id);

ALTER TABLE public.lesson_materials DROP CONSTRAINT IF EXISTS lesson_materials_kind_valid;
ALTER TABLE public.lesson_materials
  ADD CONSTRAINT lesson_materials_kind_valid
  CHECK (kind IN ('pdf', 'doc', 'image', 'external_video'));

ALTER TABLE public.lesson_materials DROP CONSTRAINT IF EXISTS lesson_materials_kind_matches_source;
ALTER TABLE public.lesson_materials
  ADD CONSTRAINT lesson_materials_kind_matches_source
  CHECK ((kind = 'external_video') = (external_url IS NOT NULL));

ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_published_has_timestamp;
ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_published_has_timestamp
  CHECK (status <> 'published' OR published_at IS NOT NULL);

ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_not_own_copy;
ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_not_own_copy CHECK (copied_from_lesson_id IS DISTINCT FROM id);

ALTER TABLE public.gradebook_categories DROP CONSTRAINT IF EXISTS gradebook_categories_weight_range;
ALTER TABLE public.gradebook_categories
  ADD CONSTRAINT gradebook_categories_weight_range
  CHECK (weight IS NULL OR (weight >= 0 AND weight <= 100));

-- ===========================================================================
-- D. CROSS-SCHOOL FOREIGN KEYS
--    Postgres does not apply RLS to FK lookups, so a plain FK lets a row
--    reference another school's row. Composite keys close that.
-- ===========================================================================

-- Targets: (id, tenant_id) must be unique on every parent
-- (profiles already has profiles_id_tenant_id_key from 0005).
CREATE UNIQUE INDEX IF NOT EXISTS academic_years_id_tenant_id_key ON public.academic_years (id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS terms_id_tenant_id_key          ON public.terms (id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS classes_id_tenant_id_key        ON public.classes (id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS subjects_id_tenant_id_key       ON public.subjects (id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS class_subjects_id_tenant_id_key ON public.class_subjects (id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS courses_id_tenant_id_key        ON public.courses (id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS lessons_id_tenant_id_key        ON public.lessons (id, tenant_id);

-- Used by assessments in a later migration (an assessment's lesson and
-- gradebook category must belong to the assessment's own course).
CREATE UNIQUE INDEX IF NOT EXISTS lessons_id_course_id_key
  ON public.lessons (id, course_id);
CREATE UNIQUE INDEX IF NOT EXISTS gradebook_categories_id_course_id_key
  ON public.gradebook_categories (id, course_id);

-- Replace each plain single-column FK with the composite one (same ON DELETE
-- behaviour as before: NO ACTION). Old FK names are looked up, not assumed.
DO $$
DECLARE
  spec record;
  old_fk text;
  old_del "char";
  old_upd "char";
  new_name text;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('terms', 'academic_year_id', 'academic_years'),
      ('class_subjects', 'class_id', 'classes'),
      ('class_subjects', 'subject_id', 'subjects'),
      ('courses', 'class_subject_id', 'class_subjects'),
      ('courses', 'term_id', 'terms'),
      ('lessons', 'course_id', 'courses'),
      ('lessons', 'created_by', 'profiles'),
      ('lesson_materials', 'lesson_id', 'lessons'),
      ('gradebook_categories', 'course_id', 'courses')
    ) AS v(child, col, parent)
  LOOP
    new_name := spec.child || '_' || spec.col || '_tenant_fk';

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = new_name AND conrelid = format('public.%I', spec.child)::regclass
    ) THEN
      CONTINUE;
    END IF;

    FOR old_fk, old_del, old_upd IN
      SELECT c.conname, c.confdeltype, c.confupdtype
      FROM pg_constraint c
      WHERE c.contype = 'f'
        AND c.conrelid = format('public.%I', spec.child)::regclass
        AND c.confrelid = format('public.%I', spec.parent)::regclass
        AND array_length(c.conkey, 1) = 1
        AND c.conkey[1] = (
          SELECT a.attnum FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attname = spec.col
        )
    LOOP
      -- The replacement uses NO ACTION. Refuse to silently drop a different action.
      IF old_del <> 'a' OR old_upd <> 'a' THEN
        RAISE EXCEPTION '0006: %.% has a custom ON DELETE/UPDATE action (%/%); review before replacing it',
          spec.child, spec.col, old_del, old_upd;
      END IF;
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', spec.child, old_fk);
    END LOOP;

    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I '
      || 'FOREIGN KEY (%I, tenant_id) REFERENCES public.%I (id, tenant_id)',
      spec.child, new_name, spec.col, spec.parent);
  END LOOP;
END $$;

-- lessons.copied_from_lesson_id: same school; if the source lesson is deleted
-- the copy keeps living and the link is cleared.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lessons_copied_from_lesson_tenant_fk'
      AND conrelid = 'public.lessons'::regclass
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_copied_from_lesson_tenant_fk
      FOREIGN KEY (copied_from_lesson_id, tenant_id)
      REFERENCES public.lessons (id, tenant_id)
      ON DELETE SET NULL (copied_from_lesson_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS lessons_copied_from_lesson_id_idx
  ON public.lessons (copied_from_lesson_id) WHERE copied_from_lesson_id IS NOT NULL;

-- ===========================================================================
-- E. TRIGGERS AND DEFAULTS
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS set_updated_at ON public.tenants;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.lessons;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- terms.sequence: next number in the year when the insert does not give one --

CREATE OR REPLACE FUNCTION public.terms_set_sequence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sequence IS NULL THEN
    -- Serialise concurrent inserts for the same year so they get different numbers.
    PERFORM 1 FROM public.academic_years WHERE id = NEW.academic_year_id FOR UPDATE;
    SELECT COALESCE(MAX(t.sequence), 0) + 1
      INTO NEW.sequence
    FROM public.terms t
    WHERE t.academic_year_id = NEW.academic_year_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.terms_set_sequence() FROM PUBLIC;

DROP TRIGGER IF EXISTS terms_set_sequence ON public.terms;
CREATE TRIGGER terms_set_sequence BEFORE INSERT ON public.terms
  FOR EACH ROW EXECUTE FUNCTION public.terms_set_sequence();

-- lessons: published_at when publishing; created_by cannot be forged ---------
-- auth.uid() is NULL for the service role and for migrations, so server-side
-- code can still set created_by explicitly.

CREATE OR REPLACE FUNCTION public.lessons_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;

  IF uid IS NOT NULL THEN
    IF TG_OP = 'INSERT' AND NEW.created_by IS DISTINCT FROM uid THEN
      RAISE EXCEPTION 'created_by must be the signed-in user'
        USING ERRCODE = 'check_violation';
    ELSIF TG_OP = 'UPDATE' AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by cannot be changed'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.lessons_before_write() FROM PUBLIC;

DROP TRIGGER IF EXISTS lessons_before_write ON public.lessons;
CREATE TRIGGER lessons_before_write BEFORE INSERT OR UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.lessons_before_write();

ALTER TABLE public.lessons ALTER COLUMN created_by SET DEFAULT auth.uid();

-- ===========================================================================
-- F. HELPERS: change the current year / term in the right order
--    SECURITY INVOKER: row level security still decides who may do this
--    (school admins only), and the function fails loudly instead of silently
--    doing nothing for anyone else.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.set_current_academic_year(p_year_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  n bigint;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.academic_years WHERE id = p_year_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'academic year not found' USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE public.academic_years
  SET is_current = false
  WHERE tenant_id = v_tenant AND is_current AND id <> p_year_id;

  UPDATE public.academic_years SET is_current = true WHERE id = p_year_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE EXCEPTION 'not allowed to change the current academic year'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_current_term(p_term_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  n bigint;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.terms WHERE id = p_term_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'term not found' USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE public.terms
  SET is_current = false
  WHERE tenant_id = v_tenant AND is_current AND id <> p_term_id;

  UPDATE public.terms SET is_current = true WHERE id = p_term_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE EXCEPTION 'not allowed to change the current term'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_current_academic_year(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_current_term(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_current_academic_year(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_current_term(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;