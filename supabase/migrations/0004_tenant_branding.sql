-- School admins can read and update their own tenant row (branding colors).
-- The row key is tenants.id, which is the JWT tenant_id claim.
-- This is not a blanket authenticated policy.
--
-- Apply after 0003_content.sql. Re-running is safe: policies are dropped
-- before create, and the grants are revoked then re-granted.

DROP POLICY IF EXISTS tenants_select_own ON public.tenants;
CREATE POLICY tenants_select_own ON public.tenants
  FOR SELECT
  TO authenticated
  USING (id = (auth.jwt() ->> 'tenant_id')::uuid);

DROP POLICY IF EXISTS tenants_update_own ON public.tenants;
CREATE POLICY tenants_update_own ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Default privileges on public may already grant ALL to authenticated.
-- Revoke that, then grant only the branding reads and updates.
REVOKE ALL ON TABLE public.tenants FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenants TO service_role;

NOTIFY pgrst, 'reload schema';
