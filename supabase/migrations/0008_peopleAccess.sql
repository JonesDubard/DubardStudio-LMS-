-- 0008: people. Invitations, CSV import jobs, enrolments, teacher assignments,
-- parent-child links. Then narrows the school-wide teacher / student / parent
-- rules that 0005 left as stopgaps (see docs/permissions.md, "What 0008 must narrow"):
--
--   Teacher, lessons    own lessons (any status) + non-draft lessons in assigned courses;
--                       writes only on assigned courses
--   Teacher, profiles   staff + students enrolled in classes they teach
--   Student, lessons    published lessons in courses of classes they are enrolled in
--   Parent, lessons     published lessons in their linked children's courses
--   Parent, profiles    self + linked children
--
-- Writes to the new tables: School Admins (enrolments, assignments, parent links).
-- Invitations and import jobs are written only by the server (Edge Functions with
-- the service role): they hold token hashes and job progress that users must not set.
--
-- Needs 0005, 0006 and 0007 applied first. PostgreSQL 15+ (ON DELETE SET NULL (col)).
-- Safe to re-run.
-- Heads-up for seeds (SEED-01): after this, teachers, students and parents only see
-- what their teacher_assignments / enrollments / parent_children rows give them, so
-- the seed must create those rows.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Preflight
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  missing text[] := '{}';
BEGIN
  IF to_regclass('public.memberships') IS NULL THEN missing := missing || '0005 (memberships)'::text; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'classes_id_tenant_id_key') THEN
    missing := missing || '0006 (classes (id, tenant_id) key)'::text;
  END IF;
  IF to_regclass('public.files') IS NULL THEN missing := missing || '0007 (files)'::text; END IF;
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION '0008 needs these applied first: %', array_to_string(missing, ', ');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.import_kind AS ENUM ('teachers', 'students', 'parents');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.import_status AS ENUM ('queued', 'validating', 'ready', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.enroll_status AS ENUM ('active', 'withdrawn', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.teach_role AS ENUM ('lead', 'co_teacher');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

-- import_jobs: one row per CSV upload (US-032a/b). The CSV itself sits in storage.
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  created_by uuid DEFAULT auth.uid(),
  kind public.import_kind NOT NULL,
  source_path text NOT NULL,
  status public.import_status NOT NULL DEFAULT 'queued',
  total_rows integer NOT NULL DEFAULT 0,
  success_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  error_report jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT import_jobs_id_tenant_id_key UNIQUE (id, tenant_id),
  CONSTRAINT import_jobs_created_by_tenant_fk
    FOREIGN KEY (created_by, tenant_id)
    REFERENCES public.profiles (id, tenant_id) ON DELETE SET NULL (created_by),
  CONSTRAINT import_jobs_source_in_tenant_folder
    CHECK (source_path LIKE tenant_id::text || '/%'),
  CONSTRAINT import_jobs_counts_valid
    CHECK (total_rows >= 0 AND success_rows >= 0 AND failed_rows >= 0
           AND success_rows + failed_rows <= total_rows)
);

CREATE INDEX IF NOT EXISTS import_jobs_tenant_created_idx
  ON public.import_jobs (tenant_id, created_at DESC);

-- invitations: how every user joins a school (US-001, US-030, US-033, US-036).
-- Only a hash of the token is stored; the token itself is only in the email.
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  email text,
  phone text,
  role public.user_role NOT NULL,
  invited_by uuid,
  accepted_user_id uuid,
  import_job_id uuid,
  token_hash text NOT NULL,
  status public.invite_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitations_token_hash_key UNIQUE (token_hash),
  CONSTRAINT invitations_id_tenant_id_key UNIQUE (id, tenant_id),
  CONSTRAINT invitations_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL),
  -- Null for invites made by a Platform Admin (first School Admin, 0010).
  CONSTRAINT invitations_invited_by_tenant_fk
    FOREIGN KEY (invited_by, tenant_id)
    REFERENCES public.profiles (id, tenant_id) ON DELETE SET NULL (invited_by),
  -- The accepted user must have a profile in the invitation's school.
  CONSTRAINT invitations_accepted_user_tenant_fk
    FOREIGN KEY (accepted_user_id, tenant_id)
    REFERENCES public.profiles (id, tenant_id) ON DELETE SET NULL (accepted_user_id),
  CONSTRAINT invitations_import_job_tenant_fk
    FOREIGN KEY (import_job_id, tenant_id)
    REFERENCES public.import_jobs (id, tenant_id) ON DELETE SET NULL (import_job_id)
);

CREATE INDEX IF NOT EXISTS invitations_tenant_status_idx
  ON public.invitations (tenant_id, status);

-- At most one open invite per person and role in a school (a resend reuses it).
CREATE UNIQUE INDEX IF NOT EXISTS invitations_one_pending_email
  ON public.invitations (tenant_id, lower(email), role)
  WHERE status = 'pending' AND email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invitations_one_pending_phone
  ON public.invitations (tenant_id, phone, role)
  WHERE status = 'pending' AND email IS NULL;

CREATE INDEX IF NOT EXISTS invitations_import_job_id_idx
  ON public.invitations (import_job_id) WHERE import_job_id IS NOT NULL;

-- enrollments: a student in a class for one academic year (US-034).
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  academic_year_id uuid NOT NULL,
  status public.enroll_status NOT NULL DEFAULT 'active',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  CONSTRAINT enrollments_student_class_year_key UNIQUE (student_id, class_id, academic_year_id),
  CONSTRAINT enrollments_id_tenant_id_key UNIQUE (id, tenant_id),
  CONSTRAINT enrollments_ended_after_start CHECK (ended_at IS NULL OR ended_at >= enrolled_at),
  CONSTRAINT enrollments_student_tenant_fk
    FOREIGN KEY (student_id, tenant_id) REFERENCES public.profiles (id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT enrollments_class_tenant_fk
    FOREIGN KEY (class_id, tenant_id) REFERENCES public.classes (id, tenant_id),
  CONSTRAINT enrollments_academic_year_tenant_fk
    FOREIGN KEY (academic_year_id, tenant_id) REFERENCES public.academic_years (id, tenant_id)
);

CREATE INDEX IF NOT EXISTS enrollments_tenant_id_idx
  ON public.enrollments (tenant_id);
CREATE INDEX IF NOT EXISTS enrollments_class_year_idx
  ON public.enrollments (class_id, academic_year_id, status);

-- teacher_assignments: a teacher on a class + subject (US-034). Courses for
-- that class + subject, in any term, belong to the teacher.
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  teacher_id uuid NOT NULL,
  class_subject_id uuid NOT NULL,
  role public.teach_role NOT NULL DEFAULT 'lead',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_assignments_teacher_class_subject_key UNIQUE (teacher_id, class_subject_id),
  CONSTRAINT teacher_assignments_id_tenant_id_key UNIQUE (id, tenant_id),
  CONSTRAINT teacher_assignments_teacher_tenant_fk
    FOREIGN KEY (teacher_id, tenant_id) REFERENCES public.profiles (id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT teacher_assignments_class_subject_tenant_fk
    FOREIGN KEY (class_subject_id, tenant_id) REFERENCES public.class_subjects (id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS teacher_assignments_tenant_id_idx
  ON public.teacher_assignments (tenant_id);
CREATE INDEX IF NOT EXISTS teacher_assignments_class_subject_id_idx
  ON public.teacher_assignments (class_subject_id);

-- parent_children: a parent linked to a child, by a School Admin (US-033, decision 4).
CREATE TABLE IF NOT EXISTS public.parent_children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL,
  relationship text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parent_children_parent_student_key UNIQUE (parent_id, student_id),
  CONSTRAINT parent_children_id_tenant_id_key UNIQUE (id, tenant_id),
  CONSTRAINT parent_children_not_self CHECK (parent_id <> student_id),
  CONSTRAINT parent_children_parent_tenant_fk
    FOREIGN KEY (parent_id, tenant_id) REFERENCES public.profiles (id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT parent_children_student_tenant_fk
    FOREIGN KEY (student_id, tenant_id) REFERENCES public.profiles (id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS parent_children_tenant_id_idx
  ON public.parent_children (tenant_id);
CREATE INDEX IF NOT EXISTS parent_children_student_id_idx
  ON public.parent_children (student_id);

-- ---------------------------------------------------------------------------
-- 3. Role checks: the person must hold the right role in the same school
--    (a teacher_assignment for a student, or a parent link to a teacher, is refused).
--    Any membership status except 'removed' counts, so people can be set up
--    before they accept their invite.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  col text := TG_ARGV[0];
  wanted public.user_role := TG_ARGV[1]::public.user_role;
  person uuid := (to_jsonb(NEW) ->> TG_ARGV[0])::uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.profile_id = person
      AND m.tenant_id = NEW.tenant_id
      AND m.role = wanted
      AND m.status <> 'removed'
  ) THEN
    RAISE EXCEPTION '%.%: % is not a % in this school', TG_TABLE_NAME, col, person, wanted
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_member_role() FROM PUBLIC;

DROP TRIGGER IF EXISTS enrollments_student_role ON public.enrollments;
CREATE TRIGGER enrollments_student_role
  BEFORE INSERT OR UPDATE OF student_id, tenant_id ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.check_member_role('student_id', 'student');

DROP TRIGGER IF EXISTS teacher_assignments_teacher_role ON public.teacher_assignments;
CREATE TRIGGER teacher_assignments_teacher_role
  BEFORE INSERT OR UPDATE OF teacher_id, tenant_id ON public.teacher_assignments
  FOR EACH ROW EXECUTE FUNCTION public.check_member_role('teacher_id', 'teacher');

DROP TRIGGER IF EXISTS parent_children_parent_role ON public.parent_children;
CREATE TRIGGER parent_children_parent_role
  BEFORE INSERT OR UPDATE OF parent_id, tenant_id ON public.parent_children
  FOR EACH ROW EXECUTE FUNCTION public.check_member_role('parent_id', 'parent');

DROP TRIGGER IF EXISTS parent_children_student_role ON public.parent_children;
CREATE TRIGGER parent_children_student_role
  BEFORE INSERT OR UPDATE OF student_id, tenant_id ON public.parent_children
  FOR EACH ROW EXECUTE FUNCTION public.check_member_role('student_id', 'student');

-- ---------------------------------------------------------------------------
-- 4. Access helpers for policies
--    Each returns ids for the signed-in user in their own school. SECURITY
--    DEFINER so policies can look through tables the caller can't read
--    (e.g. a teacher can't read other people's memberships), and so policies
--    don't call each other in a loop. Use them as  col IN (SELECT public.fn())
--    so Postgres runs each once per query, not once per row.
-- ---------------------------------------------------------------------------

-- Courses whose class + subject the caller is assigned to teach.
CREATE OR REPLACE FUNCTION public.teacher_course_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.id
  FROM public.courses c
  JOIN public.teacher_assignments ta
    ON ta.class_subject_id = c.class_subject_id AND ta.tenant_id = c.tenant_id
  WHERE ta.teacher_id = (SELECT auth.uid())
    AND ta.tenant_id = (SELECT public.jwt_tenant_id())
$$;

-- Classes the caller teaches at least one subject in.
CREATE OR REPLACE FUNCTION public.teacher_class_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT cs.class_id
  FROM public.class_subjects cs
  JOIN public.teacher_assignments ta
    ON ta.class_subject_id = cs.id AND ta.tenant_id = cs.tenant_id
  WHERE ta.teacher_id = (SELECT auth.uid())
    AND ta.tenant_id = (SELECT public.jwt_tenant_id())
$$;

-- Students actively enrolled in a class the caller teaches.
CREATE OR REPLACE FUNCTION public.teacher_student_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT e.student_id
  FROM public.enrollments e
  WHERE e.status = 'active'
    AND e.tenant_id = (SELECT public.jwt_tenant_id())
    AND e.class_id IN (SELECT public.teacher_class_ids())
$$;

-- Active teachers and School Admins of the caller's school.
CREATE OR REPLACE FUNCTION public.staff_profile_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT m.profile_id
  FROM public.memberships m
  WHERE m.tenant_id = (SELECT public.jwt_tenant_id())
    AND m.role IN ('teacher', 'school_admin')
    AND m.status = 'active'
$$;

-- Courses of the classes the given students are actively enrolled in, matching
-- the course's term to the enrolment's academic year.
CREATE OR REPLACE FUNCTION public.enrolled_course_ids(p_student_ids uuid[])
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT c.id
  FROM public.enrollments e
  JOIN public.class_subjects cs
    ON cs.class_id = e.class_id AND cs.tenant_id = e.tenant_id
  JOIN public.courses c
    ON c.class_subject_id = cs.id AND c.tenant_id = e.tenant_id
  JOIN public.terms t
    ON t.id = c.term_id AND t.academic_year_id = e.academic_year_id
  WHERE e.student_id = ANY (p_student_ids)
    AND e.status = 'active'
    AND e.tenant_id = (SELECT public.jwt_tenant_id())
$$;

-- Courses the caller is enrolled in as a student.
CREATE OR REPLACE FUNCTION public.student_course_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.enrolled_course_ids(ARRAY[(SELECT auth.uid())])
$$;

-- The caller's linked children.
CREATE OR REPLACE FUNCTION public.my_child_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pc.student_id
  FROM public.parent_children pc
  WHERE pc.parent_id = (SELECT auth.uid())
    AND pc.tenant_id = (SELECT public.jwt_tenant_id())
$$;

-- Courses the caller's linked children are enrolled in.
CREATE OR REPLACE FUNCTION public.child_course_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.enrolled_course_ids(ARRAY(SELECT public.my_child_ids()))
$$;

DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'teacher_course_ids()', 'teacher_class_ids()', 'teacher_student_ids()',
    'staff_profile_ids()', 'enrolled_course_ids(uuid[])', 'student_course_ids()',
    'my_child_ids()', 'child_course_ids()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', f);
  END LOOP;
END $$;

-- enrolled_course_ids takes any student ids, so callers outside policies must
-- not use it to look up other people's courses.
REVOKE EXECUTE ON FUNCTION public.enrolled_course_ids(uuid[]) FROM authenticated;

-- ---------------------------------------------------------------------------
-- 5. RLS on the new tables
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'import_jobs', 'invitations', 'enrollments', 'teacher_assignments', 'parent_children'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
      || 'USING (tenant_id = (SELECT public.jwt_tenant_id()))', t);
  END LOOP;
END $$;

-- import_jobs + invitations: School Admins read; only the server writes.
DROP POLICY IF EXISTS import_jobs_admin_read ON public.import_jobs;
CREATE POLICY import_jobs_admin_read ON public.import_jobs
  FOR SELECT TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')));

DROP POLICY IF EXISTS invitations_admin_read ON public.invitations;
CREATE POLICY invitations_admin_read ON public.invitations
  FOR SELECT TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')));

-- enrollments: admin writes; students see their own, parents their children's,
-- teachers those in classes they teach.
DROP POLICY IF EXISTS enrollments_admin_all ON public.enrollments;
CREATE POLICY enrollments_admin_all ON public.enrollments
  FOR ALL TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')));

DROP POLICY IF EXISTS enrollments_student_read_own ON public.enrollments;
CREATE POLICY enrollments_student_read_own ON public.enrollments
  FOR SELECT TO authenticated
  USING ((SELECT public.jwt_has_role('student')) AND student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS enrollments_parent_read ON public.enrollments;
CREATE POLICY enrollments_parent_read ON public.enrollments
  FOR SELECT TO authenticated
  USING ((SELECT public.jwt_has_role('parent')) AND student_id IN (SELECT public.my_child_ids()));

DROP POLICY IF EXISTS enrollments_teacher_read ON public.enrollments;
CREATE POLICY enrollments_teacher_read ON public.enrollments
  FOR SELECT TO authenticated
  USING ((SELECT public.jwt_has_role('teacher')) AND class_id IN (SELECT public.teacher_class_ids()));

-- teacher_assignments: admin writes; teachers see their own.
DROP POLICY IF EXISTS teacher_assignments_admin_all ON public.teacher_assignments;
CREATE POLICY teacher_assignments_admin_all ON public.teacher_assignments
  FOR ALL TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')));

DROP POLICY IF EXISTS teacher_assignments_teacher_read_own ON public.teacher_assignments;
CREATE POLICY teacher_assignments_teacher_read_own ON public.teacher_assignments
  FOR SELECT TO authenticated
  USING ((SELECT public.jwt_has_role('teacher')) AND teacher_id = (SELECT auth.uid()));

-- parent_children: admin writes; parents see their own links.
DROP POLICY IF EXISTS parent_children_admin_all ON public.parent_children;
CREATE POLICY parent_children_admin_all ON public.parent_children
  FOR ALL TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')));

DROP POLICY IF EXISTS parent_children_parent_read_own ON public.parent_children;
CREATE POLICY parent_children_parent_read_own ON public.parent_children
  FOR SELECT TO authenticated
  USING ((SELECT public.jwt_has_role('parent')) AND parent_id = (SELECT auth.uid()));

-- Grants. token_hash is never readable by users.
REVOKE ALL ON TABLE public.import_jobs, public.invitations, public.enrollments,
  public.teacher_assignments, public.parent_children FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.import_jobs TO authenticated;
GRANT SELECT (
  id, tenant_id, email, phone, role, invited_by, accepted_user_id, import_job_id,
  status, expires_at, sent_at, created_at
) ON TABLE public.invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.enrollments, public.teacher_assignments,
  public.parent_children TO authenticated;

GRANT ALL ON TABLE public.import_jobs, public.invitations, public.enrollments,
  public.teacher_assignments, public.parent_children TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Narrow lessons (replaces 0005's school-wide teacher and learner policies)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS lessons_teacher_all ON public.lessons;
DROP POLICY IF EXISTS lessons_learner_read_published ON public.lessons;

-- Read: own lessons in any status, plus other teachers' non-draft lessons in
-- assigned courses (decision 2: drafts are private to their author).
DROP POLICY IF EXISTS lessons_teacher_read ON public.lessons;
CREATE POLICY lessons_teacher_read ON public.lessons
  FOR SELECT TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND (
      created_by = (SELECT auth.uid())
      OR (status <> 'draft' AND course_id IN (SELECT public.teacher_course_ids()))
    )
  );

DROP POLICY IF EXISTS lessons_teacher_insert ON public.lessons;
CREATE POLICY lessons_teacher_insert ON public.lessons
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.jwt_has_role('teacher'))
    AND course_id IN (SELECT public.teacher_course_ids())
    AND created_by = (SELECT auth.uid())
  );

-- Edit: own lessons, or published/archived ones, in assigned courses only.
-- A teacher can't turn someone else's lesson into a draft (it would vanish for
-- students and become a draft its author can't find in their list). Changing
-- created_by is already refused by 0006's lessons_before_write trigger.
DROP POLICY IF EXISTS lessons_teacher_update ON public.lessons;
CREATE POLICY lessons_teacher_update ON public.lessons
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND course_id IN (SELECT public.teacher_course_ids())
    AND (created_by = (SELECT auth.uid()) OR status <> 'draft')
  )
  WITH CHECK (
    (SELECT public.jwt_has_role('teacher'))
    AND course_id IN (SELECT public.teacher_course_ids())
    AND (created_by = (SELECT auth.uid()) OR status <> 'draft')
  );

-- Delete: own lessons in assigned courses only.
DROP POLICY IF EXISTS lessons_teacher_delete ON public.lessons;
CREATE POLICY lessons_teacher_delete ON public.lessons
  FOR DELETE TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND course_id IN (SELECT public.teacher_course_ids())
    AND created_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS lessons_student_read ON public.lessons;
CREATE POLICY lessons_student_read ON public.lessons
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND (SELECT public.jwt_has_role('student'))
    AND course_id IN (SELECT public.student_course_ids())
  );

DROP POLICY IF EXISTS lessons_parent_read ON public.lessons;
CREATE POLICY lessons_parent_read ON public.lessons
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND (SELECT public.jwt_has_role('parent'))
    AND course_id IN (SELECT public.child_course_ids())
  );

-- ---------------------------------------------------------------------------
-- 7. Narrow lesson_materials: they follow their lesson
--    (files and storage objects follow lesson_materials through 0007's policies,
--    so they narrow with it)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS lesson_materials_teacher_all ON public.lesson_materials;
DROP POLICY IF EXISTS lesson_materials_learner_read_published ON public.lesson_materials;

-- Read: materials of any lesson the teacher can read (lessons RLS applies inside).
DROP POLICY IF EXISTS lesson_materials_teacher_read ON public.lesson_materials;
CREATE POLICY lesson_materials_teacher_read ON public.lesson_materials
  FOR SELECT TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_materials.lesson_id)
  );

-- Write: materials of lessons the teacher may edit (same rule as lessons_teacher_update).
DROP POLICY IF EXISTS lesson_materials_teacher_write ON public.lesson_materials;
CREATE POLICY lesson_materials_teacher_write ON public.lesson_materials
  FOR ALL TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_materials.lesson_id
        AND l.course_id IN (SELECT public.teacher_course_ids())
        AND (l.created_by = (SELECT auth.uid()) OR l.status <> 'draft')
    )
  );

DROP POLICY IF EXISTS lesson_materials_learner_read ON public.lesson_materials;
CREATE POLICY lesson_materials_learner_read ON public.lesson_materials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_materials.lesson_id
        AND l.status = 'published'
        AND (
          ((SELECT public.jwt_has_role('student')) AND l.course_id IN (SELECT public.student_course_ids()))
          OR ((SELECT public.jwt_has_role('parent')) AND l.course_id IN (SELECT public.child_course_ids()))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 8. Narrow profiles (decision 3)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS profiles_teacher_read ON public.profiles;
CREATE POLICY profiles_teacher_read ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT public.jwt_has_role('teacher'))
    AND (id IN (SELECT public.staff_profile_ids()) OR id IN (SELECT public.teacher_student_ids()))
  );

DROP POLICY IF EXISTS profiles_parent_read_children ON public.profiles;
CREATE POLICY profiles_parent_read_children ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT public.jwt_has_role('parent')) AND id IN (SELECT public.my_child_ids()));

NOTIFY pgrst, 'reload schema';

COMMIT;
