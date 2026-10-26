-- 0009: assessments, submissions, grades.
--
--   assessments           one table for assignments, quizzes, tests and exams.
--                         lesson_id may be empty (a term exam belongs to the course).
--                         type = assignment, or max_score must be set.
--   assessment_materials  files attached to an assessment (through files).
--   submissions           online work, for assignments only. One per student.
--   grades                one per student and assessment. submission_id is empty
--                         for paper quizzes, tests and exams. Students and parents
--                         see a grade only once released_at is set.
--
-- Also lets students upload the file for a submission (files + storage policies).
-- Storage path for those uploads:
--   {tenant_id}/submissions/{student_id}/{file}
-- The student's own id is used as the folder, not a submission id, because the
-- file is uploaded before the submission row exists and a policy can then check
-- that the folder is theirs.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Preflight
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  missing text[] := '{}';
BEGIN
  IF to_regclass('public.memberships') IS NULL THEN missing := missing || '0005 (memberships)'::text; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'lessons_id_course_id_key')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'gradebook_categories_id_course_id_key')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'courses_id_tenant_id_key') THEN
    missing := missing || '0006 (composite keys)'::text;
  END IF;
  IF to_regclass('public.files') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_id_tenant_id_key') THEN
    missing := missing || '0007 (files)'::text;
  END IF;
  IF to_regclass('public.enrollments') IS NULL
     OR to_regprocedure('public.teacher_course_ids()') IS NULL
     OR to_regprocedure('public.check_member_role()') IS NULL THEN
    missing := missing || '0008 (people)'::text;
  END IF;
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION '0009 needs these applied first: %', array_to_string(missing, ', ');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN CREATE TYPE public.assessment_type AS ENUM ('assignment', 'quiz', 'test', 'exam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.submission_status AS ENUM ('submitted', 'returned', 'resubmitted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  course_id uuid NOT NULL,
  lesson_id uuid,
  gradebook_category_id uuid,
  type public.assessment_type NOT NULL DEFAULT 'assignment',
  title text NOT NULL,
  instructions text,
  due_date timestamptz,
  assessed_on date,
  max_score numeric,
  allow_text_entry boolean NOT NULL DEFAULT true,
  allow_file_upload boolean NOT NULL DEFAULT true,
  status public.lesson_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessments_id_tenant_id_key UNIQUE (id, tenant_id),
  CONSTRAINT assessments_course_tenant_fk
    FOREIGN KEY (course_id, tenant_id) REFERENCES public.courses (id, tenant_id),
  -- The lesson and the category must belong to the same course as the assessment.
  CONSTRAINT assessments_lesson_course_fk
    FOREIGN KEY (lesson_id, course_id) REFERENCES public.lessons (id, course_id),
  CONSTRAINT assessments_category_course_fk
    FOREIGN KEY (gradebook_category_id, course_id)
    REFERENCES public.gradebook_categories (id, course_id),
  CONSTRAINT assessments_created_by_tenant_fk
    FOREIGN KEY (created_by, tenant_id) REFERENCES public.profiles (id, tenant_id),
  CONSTRAINT assessments_score_only_has_max_score
    CHECK (type = 'assignment' OR max_score IS NOT NULL),
  CONSTRAINT assessments_max_score_positive
    CHECK (max_score IS NULL OR max_score > 0),
  CONSTRAINT assessments_assignment_takes_input
    CHECK (type <> 'assignment' OR allow_text_entry OR allow_file_upload),
  CONSTRAINT assessments_published_has_timestamp
    CHECK (status <> 'published' OR published_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS assessments_tenant_id_idx ON public.assessments (tenant_id);
CREATE INDEX IF NOT EXISTS assessments_course_id_idx ON public.assessments (course_id);
CREATE INDEX IF NOT EXISTS assessments_lesson_id_idx
  ON public.assessments (lesson_id) WHERE lesson_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS assessments_category_id_idx
  ON public.assessments (gradebook_category_id) WHERE gradebook_category_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.assessment_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  assessment_id uuid NOT NULL,
  file_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessment_materials_assessment_file_key UNIQUE (assessment_id, file_id),
  CONSTRAINT assessment_materials_assessment_tenant_fk
    FOREIGN KEY (assessment_id, tenant_id)
    REFERENCES public.assessments (id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT assessment_materials_file_tenant_fk
    FOREIGN KEY (file_id, tenant_id)
    REFERENCES public.files (id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS assessment_materials_tenant_id_idx ON public.assessment_materials (tenant_id);
CREATE INDEX IF NOT EXISTS assessment_materials_file_id_idx ON public.assessment_materials (file_id);

CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  assessment_id uuid NOT NULL,
  student_id uuid NOT NULL DEFAULT auth.uid(),
  text_content text,
  file_id uuid,
  status public.submission_status NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  is_late boolean NOT NULL DEFAULT false,
  CONSTRAINT submissions_assessment_student_key UNIQUE (assessment_id, student_id),
  CONSTRAINT submissions_id_tenant_id_key UNIQUE (id, tenant_id),
  CONSTRAINT submissions_id_assessment_student_key UNIQUE (id, assessment_id, student_id),
  CONSTRAINT submissions_has_content
    CHECK ((text_content IS NOT NULL AND btrim(text_content) <> '') OR file_id IS NOT NULL),
  CONSTRAINT submissions_assessment_tenant_fk
    FOREIGN KEY (assessment_id, tenant_id) REFERENCES public.assessments (id, tenant_id),
  CONSTRAINT submissions_student_tenant_fk
    FOREIGN KEY (student_id, tenant_id) REFERENCES public.profiles (id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT submissions_file_tenant_fk
    FOREIGN KEY (file_id, tenant_id) REFERENCES public.files (id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS submissions_tenant_id_idx ON public.submissions (tenant_id);
CREATE INDEX IF NOT EXISTS submissions_student_id_idx ON public.submissions (student_id);
CREATE INDEX IF NOT EXISTS submissions_file_id_idx
  ON public.submissions (file_id) WHERE file_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  assessment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  submission_id uuid,                    -- empty for paper quizzes, tests and exams
  graded_by uuid NOT NULL DEFAULT auth.uid(),
  score numeric,
  feedback text,
  released_at timestamptz,               -- empty = not visible to student or parent
  graded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grades_assessment_student_key UNIQUE (assessment_id, student_id),
  CONSTRAINT grades_id_tenant_id_key UNIQUE (id, tenant_id),
  CONSTRAINT grades_score_not_negative CHECK (score IS NULL OR score >= 0),
  CONSTRAINT grades_release_needs_content
    CHECK (released_at IS NULL OR score IS NOT NULL OR feedback IS NOT NULL),
  CONSTRAINT grades_assessment_tenant_fk
    FOREIGN KEY (assessment_id, tenant_id) REFERENCES public.assessments (id, tenant_id),
  CONSTRAINT grades_student_tenant_fk
    FOREIGN KEY (student_id, tenant_id) REFERENCES public.profiles (id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT grades_graded_by_tenant_fk
    FOREIGN KEY (graded_by, tenant_id) REFERENCES public.profiles (id, tenant_id),
  -- When there is a submission, it must be this student's, for this assessment.
  CONSTRAINT grades_submission_match_fk
    FOREIGN KEY (submission_id, assessment_id, student_id)
    REFERENCES public.submissions (id, assessment_id, student_id) ON DELETE SET NULL (submission_id)
);

CREATE INDEX IF NOT EXISTS grades_tenant_id_idx ON public.grades (tenant_id);
CREATE INDEX IF NOT EXISTS grades_student_id_idx ON public.grades (student_id);
CREATE INDEX IF NOT EXISTS grades_submission_id_idx
  ON public.grades (submission_id) WHERE submission_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Rules in triggers
-- ---------------------------------------------------------------------------

-- Students must hold the student role in the school (0008's check).
DROP TRIGGER IF EXISTS submissions_student_role ON public.submissions;
CREATE TRIGGER submissions_student_role
  BEFORE INSERT OR UPDATE OF student_id, tenant_id ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.check_member_role('student_id', 'student');

DROP TRIGGER IF EXISTS grades_student_role ON public.grades;
CREATE TRIGGER grades_student_role
  BEFORE INSERT OR UPDATE OF student_id, tenant_id ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.check_member_role('student_id', 'student');

-- assessments: published_at, created_by, and no changes that would orphan work.
CREATE OR REPLACE FUNCTION public.assessments_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;

  IF uid IS NOT NULL THEN
    IF TG_OP = 'INSERT' AND NEW.created_by IS DISTINCT FROM uid THEN
      RAISE EXCEPTION 'created_by must be the signed-in user' USING ERRCODE = 'check_violation';
    ELSIF TG_OP = 'UPDATE' AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by cannot be changed' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.type = 'assignment' AND NEW.type <> 'assignment'
       AND EXISTS (SELECT 1 FROM public.submissions s WHERE s.assessment_id = OLD.id) THEN
      RAISE EXCEPTION 'this assignment already has submissions; it cannot become a %', NEW.type
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.course_id <> OLD.course_id
       AND (EXISTS (SELECT 1 FROM public.submissions s WHERE s.assessment_id = OLD.id)
         OR EXISTS (SELECT 1 FROM public.grades g WHERE g.assessment_id = OLD.id)) THEN
      RAISE EXCEPTION 'this assessment already has submissions or grades; it cannot move to another course'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.max_score IS DISTINCT FROM OLD.max_score
       AND NEW.max_score IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM public.grades g
         WHERE g.assessment_id = OLD.id AND g.score > NEW.max_score
       ) THEN
      RAISE EXCEPTION 'max_score cannot be lowered below an existing grade'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assessments_before_write() FROM PUBLIC;

DROP TRIGGER IF EXISTS assessments_before_write ON public.assessments;
CREATE TRIGGER assessments_before_write
  BEFORE INSERT OR UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.assessments_before_write();

-- assessment_materials: a student's submission file can never become a class handout.
CREATE OR REPLACE FUNCTION public.assessment_materials_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.files f
    WHERE f.id = NEW.file_id AND f.storage_path LIKE f.tenant_id::text || '/submissions/%'
  ) THEN
    RAISE EXCEPTION 'a student submission file cannot be used as assessment material'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assessment_materials_before_write() FROM PUBLIC;

DROP TRIGGER IF EXISTS assessment_materials_before_write ON public.assessment_materials;
CREATE TRIGGER assessment_materials_before_write
  BEFORE INSERT OR UPDATE OF file_id ON public.assessment_materials
  FOR EACH ROW EXECUTE FUNCTION public.assessment_materials_before_write();

-- submissions
CREATE OR REPLACE FUNCTION public.submissions_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean := COALESCE((SELECT public.jwt_has_role('school_admin')), false);
  a record;
BEGIN
  SELECT x.type, x.due_date, x.allow_text_entry, x.allow_file_upload
    INTO a
  FROM public.assessments x
  WHERE x.id = NEW.assessment_id AND x.tenant_id = NEW.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'assessment not found' USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF a.type <> 'assignment' THEN
    RAISE EXCEPTION 'only assignments take submissions (this is a %)', a.type
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'UPDATE' AND uid IS NOT NULL
     AND (NEW.student_id <> OLD.student_id
          OR NEW.assessment_id <> OLD.assessment_id
          OR NEW.tenant_id <> OLD.tenant_id) THEN
    RAISE EXCEPTION 'the student, assessment and school of a submission cannot be changed'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.text_content IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.text_content IS DISTINCT FROM OLD.text_content)
     AND NOT a.allow_text_entry THEN
    RAISE EXCEPTION 'this assignment does not take text answers' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.file_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.file_id IS DISTINCT FROM OLD.file_id) THEN
    IF NOT a.allow_file_upload THEN
      RAISE EXCEPTION 'this assignment does not take file uploads' USING ERRCODE = 'check_violation';
    END IF;
    -- The file must be the student's own upload (otherwise a student could attach
    -- any file id from the school and then read it through their submission).
    IF uid IS NOT NULL AND NOT is_admin AND NOT EXISTS (
      SELECT 1 FROM public.files f
      WHERE f.id = NEW.file_id
        AND f.tenant_id = NEW.tenant_id
        AND f.uploaded_by = NEW.student_id
        AND f.scan_status <> 'blocked'
        AND f.storage_path LIKE (NEW.tenant_id::text || '/submissions/' || NEW.student_id::text || '/%')
    ) THEN
      RAISE EXCEPTION 'attach a file you uploaded for submissions yourself'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF uid IS NOT NULL AND NOT is_admin THEN
    IF uid = NEW.student_id THEN
      -- The student, handing in or editing their own work.
      IF TG_OP = 'INSERT' THEN
        NEW.status := 'submitted';
      ELSE
        IF public.submission_is_graded(OLD.id) THEN
          RAISE EXCEPTION 'a graded submission cannot be edited' USING ERRCODE = 'check_violation';
        END IF;
        IF NOT public.submission_is_editable(OLD.assessment_id, OLD.status) THEN
          RAISE EXCEPTION 'submission can only be edited before the due date or after it has been returned'
            USING ERRCODE = 'check_violation';
        END IF;
        NEW.status := CASE WHEN OLD.status = 'returned' THEN 'resubmitted' ELSE OLD.status END;
      END IF;
      NEW.submitted_at := now();
    ELSE
      -- Staff: may only return a submission to the student.
      IF TG_OP = 'INSERT' THEN
        RAISE EXCEPTION 'only the student can hand in their work' USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.text_content IS DISTINCT FROM OLD.text_content
         OR NEW.file_id IS DISTINCT FROM OLD.file_id
         OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
        RAISE EXCEPTION 'staff cannot edit a student''s work' USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'returned' THEN
        RAISE EXCEPTION 'staff can only set the status to returned' USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  NEW.is_late := (a.due_date IS NOT NULL AND NEW.submitted_at > a.due_date);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.submissions_before_write() FROM PUBLIC;

DROP TRIGGER IF EXISTS submissions_before_write ON public.submissions;
CREATE TRIGGER submissions_before_write
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.submissions_before_write();

-- grades
CREATE OR REPLACE FUNCTION public.grades_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
  max_allowed numeric;
BEGIN
  SELECT x.max_score INTO max_allowed
  FROM public.assessments x
  WHERE x.id = NEW.assessment_id AND x.tenant_id = NEW.tenant_id;

  IF NEW.score IS NOT NULL AND max_allowed IS NOT NULL AND NEW.score > max_allowed THEN
    RAISE EXCEPTION 'score % is above the maximum of %', NEW.score, max_allowed
      USING ERRCODE = 'check_violation';
  END IF;

  IF uid IS NOT NULL THEN
    NEW.graded_by := uid;
    IF TG_OP = 'INSERT'
       OR NEW.score IS DISTINCT FROM OLD.score
       OR NEW.feedback IS DISTINCT FROM OLD.feedback THEN
      NEW.graded_at := now();
    END IF;
    -- The release time is set by the server: it cannot be back-dated or scheduled.
    IF TG_OP = 'UPDATE' AND OLD.released_at IS NOT NULL AND NEW.released_at IS NULL THEN
      RAISE EXCEPTION 'a released grade cannot be unreleased' USING ERRCODE = 'check_violation';
    ELSIF NEW.released_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.released_at IS NULL) THEN
      NEW.released_at := now();
    ELSIF TG_OP = 'UPDATE' AND NEW.released_at IS NOT NULL AND OLD.released_at IS NOT NULL THEN
      NEW.released_at := OLD.released_at;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.grades_before_write() FROM PUBLIC;

DROP TRIGGER IF EXISTS grades_before_write ON public.grades;
CREATE TRIGGER grades_before_write
  BEFORE INSERT OR UPDATE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.grades_before_write();

-- ---------------------------------------------------------------------------
-- 4. Access helpers (same pattern as 0008)
-- ---------------------------------------------------------------------------

-- Assessments in courses the caller teaches.
CREATE OR REPLACE FUNCTION public.teacher_assessment_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.id
  FROM public.assessments a
  WHERE a.tenant_id = (SELECT public.jwt_tenant_id())
    AND a.course_id IN (SELECT public.teacher_course_ids())
$$;

-- Published assessments in courses the caller is enrolled in.
CREATE OR REPLACE FUNCTION public.student_assessment_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.id
  FROM public.assessments a
  WHERE a.tenant_id = (SELECT public.jwt_tenant_id())
    AND a.status = 'published'
    AND a.course_id IN (SELECT public.student_course_ids())
$$;

-- Check whether a teacher may grade this particular student for this assessment.
-- The student must be actively enrolled in the class and academic year attached
-- to the assessment's course, not merely in the same school or another class.
CREATE OR REPLACE FUNCTION public.teacher_can_grade_student(
  p_assessment_id uuid,
  p_student_id uuid
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assessments a
    JOIN public.courses c
      ON c.id = a.course_id AND c.tenant_id = a.tenant_id
    JOIN public.class_subjects cs
      ON cs.id = c.class_subject_id AND cs.tenant_id = c.tenant_id
    JOIN public.terms t
      ON t.id = c.term_id
    JOIN public.enrollments e
      ON e.class_id = cs.class_id
     AND e.academic_year_id = t.academic_year_id
     AND e.tenant_id = a.tenant_id
    WHERE a.id = p_assessment_id
      AND a.tenant_id = (SELECT public.jwt_tenant_id())
      AND a.course_id IN (SELECT public.teacher_course_ids())
      AND e.student_id = p_student_id
      AND e.status = 'active'
  )
$$;

-- Has this submission been graded (released or not)? The helper returns false
-- for IDs outside the caller's own authorized scope to reduce information leaks.
CREATE OR REPLACE FUNCTION public.submission_is_graded(p_submission_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.submissions s
    JOIN public.grades g ON g.submission_id = s.id AND g.tenant_id = s.tenant_id
    WHERE s.id = p_submission_id
      AND s.tenant_id = (SELECT public.jwt_tenant_id())
      AND (
        ((SELECT public.jwt_has_role('student')) AND s.student_id = (SELECT auth.uid()))
        OR ((SELECT public.jwt_has_role('teacher')) AND s.assessment_id IN (SELECT public.teacher_assessment_ids()))
        OR ((SELECT public.jwt_has_role('school_admin')))
      )
  )
$$;

-- May the caller still edit this assessment's submission? Keep the helper scoped
-- to the authenticated student and the student's currently published courses.
CREATE OR REPLACE FUNCTION public.submission_is_editable(p_assessment_id uuid, p_status public.submission_status)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = p_assessment_id
      AND a.tenant_id = (SELECT public.jwt_tenant_id())
      AND (SELECT public.jwt_has_role('student'))
      AND a.status = 'published'
      AND a.course_id IN (SELECT public.student_course_ids())
      AND (a.due_date IS NULL OR now() <= a.due_date OR p_status = 'returned')
  )
$$;

-- A student may delete only an unreferenced submission upload they own.
-- SECURITY DEFINER is needed so the reference checks cannot be hidden by RLS.
CREATE OR REPLACE FUNCTION public.can_delete_submission_storage_object(p_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    -- Permit cleanup of an orphaned Storage object after its metadata row was
    -- already deleted; the Storage policy separately verifies owner and folder.
    NOT EXISTS (
      SELECT 1 FROM public.files f
      WHERE f.storage_path = p_name
        AND f.tenant_id = (SELECT public.jwt_tenant_id())
    )
    OR EXISTS (
      SELECT 1 FROM public.files f
      WHERE f.storage_path = p_name
        AND f.tenant_id = (SELECT public.jwt_tenant_id())
        AND f.uploaded_by = (SELECT auth.uid())
        AND f.storage_path LIKE (f.tenant_id::text || '/submissions/' || (SELECT auth.uid())::text || '/%')
        AND NOT EXISTS (SELECT 1 FROM public.submissions s WHERE s.file_id = f.id)
        AND NOT EXISTS (SELECT 1 FROM public.assessment_materials am WHERE am.file_id = f.id)
        AND NOT EXISTS (SELECT 1 FROM public.lesson_materials lm WHERE lm.file_id = f.id)
    )
$$;

DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'teacher_assessment_ids()', 'student_assessment_ids()',
    'teacher_can_grade_student(uuid, uuid)', 'submission_is_graded(uuid)',
    'submission_is_editable(uuid, public.submission_status)',
    'can_delete_submission_storage_object(text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', f);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Row level security
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['assessments', 'assessment_materials', 'submissions', 'grades'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
      || 'USING (tenant_id = (SELECT public.jwt_tenant_id()))', t);
  END LOOP;
END $$;

-- assessments ---------------------------------------------------------------

DROP POLICY IF EXISTS assessments_admin_all ON public.assessments;
CREATE POLICY assessments_admin_all ON public.assessments
  FOR ALL TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')));

-- Teachers: own assessments in any status, other teachers' non-draft ones in
-- assigned courses (same rule as lessons).
DROP POLICY IF EXISTS assessments_teacher_read ON public.assessments;
CREATE POLICY assessments_teacher_read ON public.assessments
  FOR SELECT TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND (
      created_by = (SELECT auth.uid())
      OR (status <> 'draft' AND course_id IN (SELECT public.teacher_course_ids()))
    )
  );

DROP POLICY IF EXISTS assessments_teacher_insert ON public.assessments;
CREATE POLICY assessments_teacher_insert ON public.assessments
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.jwt_has_role('teacher'))
    AND course_id IN (SELECT public.teacher_course_ids())
    AND created_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS assessments_teacher_update ON public.assessments;
CREATE POLICY assessments_teacher_update ON public.assessments
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND course_id IN (SELECT public.teacher_course_ids())
    AND (created_by = (SELECT auth.uid()) OR status <> 'draft')
  )
  WITH CHECK (
    (SELECT public.jwt_has_role('teacher'))
    AND course_id IN (SELECT public.teacher_course_ids())
  );

DROP POLICY IF EXISTS assessments_teacher_delete ON public.assessments;
CREATE POLICY assessments_teacher_delete ON public.assessments
  FOR DELETE TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND course_id IN (SELECT public.teacher_course_ids())
    AND created_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS assessments_student_read ON public.assessments;
CREATE POLICY assessments_student_read ON public.assessments
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND (SELECT public.jwt_has_role('student'))
    AND course_id IN (SELECT public.student_course_ids())
  );

DROP POLICY IF EXISTS assessments_parent_read ON public.assessments;
CREATE POLICY assessments_parent_read ON public.assessments
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND (SELECT public.jwt_has_role('parent'))
    AND course_id IN (SELECT public.child_course_ids())
  );

-- assessment_materials: they follow their assessment ----------------------------

DROP POLICY IF EXISTS assessment_materials_admin_all ON public.assessment_materials;
CREATE POLICY assessment_materials_admin_all ON public.assessment_materials
  FOR ALL TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')));

DROP POLICY IF EXISTS assessment_materials_teacher_read ON public.assessment_materials;
CREATE POLICY assessment_materials_teacher_read ON public.assessment_materials
  FOR SELECT TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_materials.assessment_id)
  );

DROP POLICY IF EXISTS assessment_materials_teacher_write ON public.assessment_materials;
CREATE POLICY assessment_materials_teacher_write ON public.assessment_materials
  FOR ALL TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_materials.assessment_id
        AND a.course_id IN (SELECT public.teacher_course_ids())
        AND (a.created_by = (SELECT auth.uid()) OR a.status <> 'draft')
    )
  );

DROP POLICY IF EXISTS assessment_materials_learner_read ON public.assessment_materials;
CREATE POLICY assessment_materials_learner_read ON public.assessment_materials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_materials.assessment_id
        AND a.status = 'published'
        AND (
          ((SELECT public.jwt_has_role('student')) AND a.course_id IN (SELECT public.student_course_ids()))
          OR ((SELECT public.jwt_has_role('parent')) AND a.course_id IN (SELECT public.child_course_ids()))
        )
    )
  );

-- submissions ------------------------------------------------------------------

DROP POLICY IF EXISTS submissions_admin_all ON public.submissions;
CREATE POLICY submissions_admin_all ON public.submissions
  FOR ALL TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')));

DROP POLICY IF EXISTS submissions_teacher_read ON public.submissions;
CREATE POLICY submissions_teacher_read ON public.submissions
  FOR SELECT TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND assessment_id IN (SELECT public.teacher_assessment_ids())
  );

-- Teachers may only return a submission (the trigger enforces "only the status").
DROP POLICY IF EXISTS submissions_teacher_update ON public.submissions;
CREATE POLICY submissions_teacher_update ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND assessment_id IN (SELECT public.teacher_assessment_ids())
  )
  WITH CHECK (
    (SELECT public.jwt_has_role('teacher'))
    AND assessment_id IN (SELECT public.teacher_assessment_ids())
  );

DROP POLICY IF EXISTS submissions_student_read_own ON public.submissions;
CREATE POLICY submissions_student_read_own ON public.submissions
  FOR SELECT TO authenticated
  USING ((SELECT public.jwt_has_role('student')) AND student_id = (SELECT auth.uid()));

-- Hand in: own work, on a published assignment of a class they are in.
-- Late work is accepted and flagged by the trigger.
DROP POLICY IF EXISTS submissions_student_insert ON public.submissions;
CREATE POLICY submissions_student_insert ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.jwt_has_role('student'))
    AND student_id = (SELECT auth.uid())
    AND assessment_id IN (SELECT public.student_assessment_ids())
  );

-- Edit: own work, not yet graded, before the due date (or returned for another try).
DROP POLICY IF EXISTS submissions_student_update_own ON public.submissions;
CREATE POLICY submissions_student_update_own ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.jwt_has_role('student'))
    AND student_id = (SELECT auth.uid())
    AND assessment_id IN (SELECT public.student_assessment_ids())
    AND NOT public.submission_is_graded(id)
    AND public.submission_is_editable(assessment_id, status)
  )
  WITH CHECK (
    (SELECT public.jwt_has_role('student'))
    AND student_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS submissions_parent_read ON public.submissions;
CREATE POLICY submissions_parent_read ON public.submissions
  FOR SELECT TO authenticated
  USING (
    (SELECT public.jwt_has_role('parent'))
    AND student_id IN (SELECT public.my_child_ids())
  );

-- grades -----------------------------------------------------------------------

DROP POLICY IF EXISTS grades_admin_all ON public.grades;
CREATE POLICY grades_admin_all ON public.grades
  FOR ALL TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')));

DROP POLICY IF EXISTS grades_teacher_all ON public.grades;
DROP POLICY IF EXISTS grades_teacher_read ON public.grades;
CREATE POLICY grades_teacher_read ON public.grades
  FOR SELECT TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND assessment_id IN (SELECT public.teacher_assessment_ids())
    AND public.teacher_can_grade_student(assessment_id, student_id)
  );

DROP POLICY IF EXISTS grades_teacher_insert ON public.grades;
CREATE POLICY grades_teacher_insert ON public.grades
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.jwt_has_role('teacher'))
    AND assessment_id IN (SELECT public.teacher_assessment_ids())
    AND public.teacher_can_grade_student(assessment_id, student_id)
    AND graded_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS grades_teacher_update ON public.grades;
CREATE POLICY grades_teacher_update ON public.grades
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND assessment_id IN (SELECT public.teacher_assessment_ids())
    AND public.teacher_can_grade_student(assessment_id, student_id)
  )
  WITH CHECK (
    (SELECT public.jwt_has_role('teacher'))
    AND assessment_id IN (SELECT public.teacher_assessment_ids())
    AND public.teacher_can_grade_student(assessment_id, student_id)
    AND graded_by = (SELECT auth.uid())
  );

-- Students and parents: only released grades, only their own / their children's.
DROP POLICY IF EXISTS grades_student_read_released ON public.grades;
CREATE POLICY grades_student_read_released ON public.grades
  FOR SELECT TO authenticated
  USING (
    (SELECT public.jwt_has_role('student'))
    AND student_id = (SELECT auth.uid())
    AND released_at IS NOT NULL
  );

DROP POLICY IF EXISTS grades_parent_read_released ON public.grades;
CREATE POLICY grades_parent_read_released ON public.grades
  FOR SELECT TO authenticated
  USING (
    (SELECT public.jwt_has_role('parent'))
    AND student_id IN (SELECT public.my_child_ids())
    AND released_at IS NOT NULL
  );

-- Grants. Server-set columns (status on insert, submitted_at, is_late, graded_by,
-- graded_at, updated_at) are not writable by users; the triggers set them.
-- DELETE is granted at table level, but only school admins have a matching RLS
-- policy; teachers have no grade DELETE policy.
REVOKE ALL ON TABLE public.assessments, public.assessment_materials,
  public.submissions, public.grades FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assessments, public.assessment_materials
  TO authenticated;

GRANT SELECT ON TABLE public.submissions TO authenticated;
GRANT INSERT (id, tenant_id, assessment_id, student_id, text_content, file_id)
  ON TABLE public.submissions TO authenticated;
GRANT UPDATE (text_content, file_id, status) ON TABLE public.submissions TO authenticated;

GRANT SELECT, DELETE ON TABLE public.grades TO authenticated;
GRANT INSERT (id, tenant_id, assessment_id, student_id, submission_id, score, feedback, released_at)
  ON TABLE public.grades TO authenticated;
GRANT UPDATE (submission_id, score, feedback, released_at) ON TABLE public.grades TO authenticated;

GRANT ALL ON TABLE public.assessments, public.assessment_materials,
  public.submissions, public.grades TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Files and storage: assessment materials, and student uploads for submissions
-- ---------------------------------------------------------------------------

-- Students and parents see a file if it is a lesson material, an assessment
-- material, or a submission file they may see (RLS applies inside each subquery).
DROP POLICY IF EXISTS files_learner_read ON public.files;
CREATE POLICY files_learner_read ON public.files
  FOR SELECT TO authenticated
  USING (
    ((SELECT public.jwt_has_role('student')) OR (SELECT public.jwt_has_role('parent')))
    AND scan_status <> 'blocked'
    AND (
      EXISTS (SELECT 1 FROM public.lesson_materials lm WHERE lm.file_id = files.id)
      OR EXISTS (SELECT 1 FROM public.assessment_materials am WHERE am.file_id = files.id)
      OR EXISTS (
        SELECT 1 FROM public.submissions s
        WHERE s.file_id = files.id
          AND (
            ((SELECT public.jwt_has_role('student')) AND s.student_id = (SELECT auth.uid()))
            OR ((SELECT public.jwt_has_role('parent')) AND s.student_id IN (SELECT public.my_child_ids()))
          )
      )
    )
  );

-- Students see, add and remove their own submission uploads. Metadata and Storage
-- deletion both reject files still referenced by submissions or learning materials.
DROP POLICY IF EXISTS files_student_read_own ON public.files;
CREATE POLICY files_student_read_own ON public.files
  FOR SELECT TO authenticated
  USING (
    (SELECT public.jwt_has_role('student'))
    AND uploaded_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS files_student_insert ON public.files;
CREATE POLICY files_student_insert ON public.files
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.jwt_has_role('student'))
    AND uploaded_by = (SELECT auth.uid())
    AND storage_path LIKE (tenant_id::text || '/submissions/' || (SELECT auth.uid())::text || '/%')
  );

DROP POLICY IF EXISTS files_student_delete_own ON public.files;
CREATE POLICY files_student_delete_own ON public.files
  FOR DELETE TO authenticated
  USING (
    (SELECT public.jwt_has_role('student'))
    AND uploaded_by = (SELECT auth.uid())
    AND storage_path LIKE (tenant_id::text || '/submissions/' || (SELECT auth.uid())::text || '/%')
    AND NOT EXISTS (SELECT 1 FROM public.submissions s WHERE s.file_id = files.id)
    AND NOT EXISTS (SELECT 1 FROM public.assessment_materials am WHERE am.file_id = files.id)
    AND NOT EXISTS (SELECT 1 FROM public.lesson_materials lm WHERE lm.file_id = files.id)
  );

-- Storage: a student may upload into, and delete from, their own submissions folder only.
DROP POLICY IF EXISTS tenant_files_student_upload ON storage.objects;
CREATE POLICY tenant_files_student_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-files'
    AND (SELECT public.jwt_has_role('student'))
    AND (storage.foldername(name))[1] = (SELECT public.jwt_tenant_id())::text
    AND (storage.foldername(name))[2] = 'submissions'
    AND (storage.foldername(name))[3] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS tenant_files_student_delete ON storage.objects;
CREATE POLICY tenant_files_student_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-files'
    AND (SELECT public.jwt_has_role('student'))
    AND (storage.foldername(name))[1] = (SELECT public.jwt_tenant_id())::text
    AND (storage.foldername(name))[2] = 'submissions'
    AND (storage.foldername(name))[3] = (SELECT auth.uid())::text
    AND owner_id = (SELECT auth.uid())::text
    AND public.can_delete_submission_storage_object(name)
  );

NOTIFY pgrst, 'reload schema';

COMMIT;