-- A signed-in user can change their own display name and profile email.
-- Role, school, and phone stay off this grant. Tenant isolation still applies.

BEGIN;

DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

GRANT UPDATE (full_name, email) ON TABLE public.profiles TO authenticated;

COMMIT;
