-- School admins can store a header logo, and every member of the school
-- can read branding files so the mark shows in the sidebar.

BEGIN;

GRANT UPDATE (header_logo_url) ON TABLE public.tenants TO authenticated;

DROP POLICY IF EXISTS files_member_read_branding ON public.files;
CREATE POLICY files_member_read_branding ON public.files
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT public.jwt_tenant_id())
    AND storage_path LIKE ((SELECT public.jwt_tenant_id())::text || '/branding/%')
    AND scan_status <> 'blocked'
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
