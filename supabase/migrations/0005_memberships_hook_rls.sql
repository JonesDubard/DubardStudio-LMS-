-- 0005: memberships, JWT hook update, RLS rewrite.
-- Replaces profiles.role with memberships, makes the hook emit an app_roles
-- array, and rebuilds RLS on every existing table (restrictive tenant guard
-- + permissive role policies). Replaces the tenants policies and grants from 0004.
--
-- Teacher / student / parent rules are deliberately school-wide here;
-- 0008 narrows them once enrollments and teacher_assignments exist.
-- Release note: the frontend must read app_roles (array) instead of app_role,
-- and users must sign out and back in so tokens carry the new claim.
-- Also drops the spike-only auth_spike_exec helper (update the e2e spec first).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Enum + profiles columns
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  CREATE TYPE public.user_status AS ENUM ('invited', 'active', 'suspended', 'removed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_number text,
  ADD COLUMN IF NOT EXISTS status public.user_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS profiles_tenant_id_idx ON public.profiles (tenant_id);

-- Target of the composite FK from memberships (profile and tenant must agree).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_id_tenant_id_key' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_tenant_id_key UNIQUE (id, tenant_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. memberships
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  profile_id uuid NOT NULL,
  role public.user_role NOT NULL,
  status public.user_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, role),
  CONSTRAINT memberships_profile_tenant_fk
    FOREIGN KEY (profile_id, tenant_id)
    REFERENCES public.profiles (id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS memberships_tenant_id_idx
  ON public.memberships (tenant_id);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- The hook runs as supabase_auth_admin (same reason as profiles in 0001).
DROP POLICY IF EXISTS memberships_auth_hook_read ON public.memberships;
CREATE POLICY memberships_auth_hook_read ON public.memberships
  FOR SELECT TO supabase_auth_admin USING (true);

GRANT SELECT ON TABLE public.memberships TO supabase_auth_admin;

REVOKE ALL ON TABLE public.memberships FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.memberships
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Backfill from profiles.role, then (later in this file) drop the column
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    INSERT INTO public.memberships (tenant_id, profile_id, role)
    SELECT tenant_id, id, role FROM public.profiles
    ON CONFLICT (profile_id, role) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. JWT hook: read memberships, emit app_roles (array). Same name and
--    signature as 0001, so grants and the dashboard registration are kept.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb := event->'claims';
  uid uuid := (event->>'user_id')::uuid;
  v_tenant uuid;
  v_roles text[];
BEGIN
  -- Platform admins: no tenant, no profile, no memberships.
  IF EXISTS (SELECT 1 FROM public.platform_admins WHERE id = uid) THEN
    claims := jsonb_set(claims, '{app_roles}', '["platform_admin"]');
    RETURN jsonb_set(event, '{claims}', claims);
  END IF;

  SELECT p.tenant_id, array_agg(m.role::text ORDER BY m.role::text)
    INTO v_tenant, v_roles
  FROM public.profiles p
  JOIN public.memberships m
    ON m.profile_id = p.id AND m.tenant_id = p.tenant_id
  WHERE p.id = uid
    AND p.status = 'active'
    AND m.status = 'active'
  GROUP BY p.tenant_id;

  -- No active membership => no tenant_id and no roles => RLS denies everything.
  IF v_tenant IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(v_tenant));
    claims := jsonb_set(claims, '{app_roles}', to_jsonb(v_roles));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb)
  TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb)
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Claim helpers used by every policy
--    Call them as (SELECT public.jwt_tenant_id()) so Postgres evaluates once
--    per query instead of once per row.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.jwt_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT ((SELECT auth.jwt()) ->> 'tenant_id')::uuid $$;

CREATE OR REPLACE FUNCTION public.jwt_has_role(r text)
RETURNS boolean
LANGUAGE sql STABLE
AS $$ SELECT COALESCE(((SELECT auth.jwt()) -> 'app_roles') @> to_jsonb(r), false) $$;

REVOKE EXECUTE ON FUNCTION public.jwt_tenant_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.jwt_has_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jwt_tenant_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.jwt_has_role(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. tenants: read own row; only a school admin updates it, branding only
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tenants_select_own ON public.tenants;
CREATE POLICY tenants_select_own ON public.tenants
  FOR SELECT TO authenticated
  USING (id = (SELECT public.jwt_tenant_id()));

DROP POLICY IF EXISTS tenants_update_own ON public.tenants;
CREATE POLICY tenants_update_own ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = (SELECT public.jwt_tenant_id())
         AND (SELECT public.jwt_has_role('school_admin')))
  WITH CHECK (id = (SELECT public.jwt_tenant_id()));

REVOKE ALL ON TABLE public.tenants FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.tenants TO authenticated;
GRANT UPDATE (primary_color, secondary_color, logo_url, favicon_url)
  ON TABLE public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenants TO service_role;

-- ---------------------------------------------------------------------------
-- 7. profiles + memberships policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_isolation ON public.profiles;
CREATE POLICY tenant_isolation ON public.profiles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.jwt_tenant_id()));

DROP POLICY IF EXISTS profiles_self_read ON public.profiles;
CREATE POLICY profiles_self_read ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_admin_read ON public.profiles;
CREATE POLICY profiles_admin_read ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')));

DROP POLICY IF EXISTS profiles_teacher_read ON public.profiles;
CREATE POLICY profiles_teacher_read ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT public.jwt_has_role('teacher')));

REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;

DROP POLICY IF EXISTS tenant_isolation ON public.memberships;
CREATE POLICY tenant_isolation ON public.memberships
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.jwt_tenant_id()));

DROP POLICY IF EXISTS memberships_self_read ON public.memberships;
CREATE POLICY memberships_self_read ON public.memberships
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS memberships_admin_all ON public.memberships;
CREATE POLICY memberships_admin_all ON public.memberships
  FOR ALL TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')));

-- ---------------------------------------------------------------------------
-- 8. Rewrite the policies on the existing tenant tables
--    Structure tables: any member reads, school admin writes.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'academic_years', 'terms', 'classes', 'subjects', 'class_subjects', 'courses'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
      || 'USING (tenant_id = (SELECT public.jwt_tenant_id()))', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_member_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      t || '_member_read', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      || 'USING ((SELECT public.jwt_has_role(''school_admin'')))',
      t || '_admin_all', t);
  END LOOP;
END $$;

-- lessons: admin all; teacher all (school-wide until 0005);
-- student/parent read published only.
DROP POLICY IF EXISTS tenant_isolation ON public.lessons;
CREATE POLICY tenant_isolation ON public.lessons
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.jwt_tenant_id()));

DROP POLICY IF EXISTS lessons_admin_all ON public.lessons;
CREATE POLICY lessons_admin_all ON public.lessons
  FOR ALL TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')));

DROP POLICY IF EXISTS lessons_teacher_all ON public.lessons;
CREATE POLICY lessons_teacher_all ON public.lessons
  FOR ALL TO authenticated
  USING ((SELECT public.jwt_has_role('teacher')));

DROP POLICY IF EXISTS lessons_learner_read_published ON public.lessons;
CREATE POLICY lessons_learner_read_published ON public.lessons
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND ((SELECT public.jwt_has_role('student')) OR (SELECT public.jwt_has_role('parent')))
  );

-- lesson_materials: same shape, gated by the parent lesson being published.
DROP POLICY IF EXISTS tenant_isolation ON public.lesson_materials;
CREATE POLICY tenant_isolation ON public.lesson_materials
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.jwt_tenant_id()));

DROP POLICY IF EXISTS lesson_materials_admin_all ON public.lesson_materials;
CREATE POLICY lesson_materials_admin_all ON public.lesson_materials
  FOR ALL TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')));

DROP POLICY IF EXISTS lesson_materials_teacher_all ON public.lesson_materials;
CREATE POLICY lesson_materials_teacher_all ON public.lesson_materials
  FOR ALL TO authenticated
  USING ((SELECT public.jwt_has_role('teacher')));

DROP POLICY IF EXISTS lesson_materials_learner_read_published ON public.lesson_materials;
CREATE POLICY lesson_materials_learner_read_published ON public.lesson_materials
  FOR SELECT TO authenticated
  USING (
    ((SELECT public.jwt_has_role('student')) OR (SELECT public.jwt_has_role('parent')))
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_materials.lesson_id AND l.status = 'published'
    )
  );

-- gradebook_categories: any member reads; admin and teacher write.
DROP POLICY IF EXISTS tenant_isolation ON public.gradebook_categories;
CREATE POLICY tenant_isolation ON public.gradebook_categories
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.jwt_tenant_id()));

DROP POLICY IF EXISTS gradebook_categories_member_read ON public.gradebook_categories;
CREATE POLICY gradebook_categories_member_read ON public.gradebook_categories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS gradebook_categories_staff_write ON public.gradebook_categories;
CREATE POLICY gradebook_categories_staff_write ON public.gradebook_categories
  FOR ALL TO authenticated
  USING ((SELECT public.jwt_has_role('school_admin')) OR (SELECT public.jwt_has_role('teacher')));

-- ---------------------------------------------------------------------------
-- 9. Last school admin guard
--    (Tearing down a whole tenant in dev: delete via service role with
--     ALTER TABLE public.memberships DISABLE TRIGGER memberships_last_admin_guard.)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_last_school_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'school_admin'
     AND OLD.status = 'active'
     AND (TG_OP = 'DELETE'
          OR NEW.role <> 'school_admin'
          OR NEW.tenant_id <> OLD.tenant_id
          OR NEW.status <> 'active')
  THEN
    -- Serialise admin removals per tenant so two admins cannot remove each
    -- other at the same moment and both pass the check.
    PERFORM 1 FROM public.tenants WHERE id = OLD.tenant_id FOR UPDATE;

    IF NOT EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.tenant_id = OLD.tenant_id
        AND m.role = 'school_admin'
        AND m.status = 'active'
        AND m.id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'cannot remove the last active school_admin of a tenant'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_last_school_admin() FROM PUBLIC;

DROP TRIGGER IF EXISTS memberships_last_admin_guard ON public.memberships;
CREATE TRIGGER memberships_last_admin_guard
  BEFORE UPDATE OR DELETE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.guard_last_school_admin();

-- ---------------------------------------------------------------------------
-- 10. Drop profiles.role (roles now live in memberships)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- ---------------------------------------------------------------------------
-- 11. Remove the spike-only DDL helper from 0001 (SECURITY DEFINER, runs DDL)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.auth_spike_exec(text);

NOTIFY pgrst, 'reload schema';

COMMIT;