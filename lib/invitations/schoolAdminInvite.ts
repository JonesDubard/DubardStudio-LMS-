import { sendInvite, type InviteDeps, type InviteResult } from "./sendInvite";

export interface SchoolRow {
  id: string;
  name: string;
  contact_email: string;
  contact_name: string | null;
  subdomain?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
}

export function inviteFirstSchoolAdmin(school: SchoolRow, deps: InviteDeps): Promise<InviteResult> {
  return sendInvite(
    {
      tenantId: school.id,
      schoolName: school.name,
      schoolSubdomain: school.subdomain,
      logoUrl: school.logo_url,
      primaryColor: school.primary_color,
      email: school.contact_email,
      inviteeName: school.contact_name ?? undefined,
      role: "school_admin",
      invitedBy: null,
    },
    deps,
  );
}

type Reader = { from: (table: any) => any };

type School = { id: string; name: string; subdomain: string | null; logo_url: string | null; primary_color: string | null };

async function loadSchool(tenantId: string, read: Reader): Promise<School | null> {
  const { data } = await read
    .from("tenants")
    .select("id, name, subdomain, logo_url, primary_color")
    .eq("id", tenantId)
    .maybeSingle();
  return (data as School | null) ?? null;
}


export async function inviteSchoolAdmin(
  platformAdminId: string,
  tenantId: string,
  email: string,
  deps: InviteDeps & { read: Reader },
): Promise<InviteResult> {
  const school = await loadSchool(tenantId, deps.read);
  if (!school) return { ok: false, code: "school_not_found", message: "school_not_found" };

  return sendInvite(
    {
      tenantId: school.id,
      schoolName: school.name,
      schoolSubdomain: school.subdomain,
      logoUrl: school.logo_url,
      primaryColor: school.primary_color,
      email,
      role: "school_admin",
      invitedBy: null,
      platformAdminId,
    },
    deps,
  );
}


export async function resendSchoolAdminInvite(
  tenantId: string,
  deps: InviteDeps & { read: Reader },
  invitationId?: string,
): Promise<InviteResult> {
  const school = await loadSchool(tenantId, deps.read);
  if (!school) return { ok: false, code: "school_not_found", message: "school_not_found" };

  let query = deps.read
    .from("invitations")
    .select("email")
    .eq("tenant_id", tenantId)
    .eq("role", "school_admin")
    .eq("status", "pending");
  if (invitationId) query = query.eq("id", invitationId);
  const { data: open } = await query.limit(1).maybeSingle();
  if (!open?.email) {
    return { ok: false, code: "no_open_invite", message: "There is no open School Admin invite for this school (already accepted?)." };
  }

  return sendInvite(
    {
      tenantId, schoolName: school.name, schoolSubdomain: school.subdomain, logoUrl: school.logo_url, primaryColor: school.primary_color,
      email: open.email, role: "school_admin", invitedBy: null
    },
    deps,
  );
}