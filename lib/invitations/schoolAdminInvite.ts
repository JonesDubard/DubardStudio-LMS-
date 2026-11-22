// US-008b.2 and US-008b.4: the School Admin invite for a new school, and "Resend invite".
// Call both only from server code, after checking the caller is an active Platform Admin.
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

/** US-008b.2: call right after provision_tenant() succeeds. */
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
      invitedBy: null, // a Platform Admin has no profile (0008)
    },
    deps,
  );
}

// What the resend needs to look up: a Supabase client (kept loose, see Rpc in sendInvite.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reader = { from: (table: any) => any };

/**
 * US-008b.4: resend the School Admin invite of a school.
 * Finds the school's open School Admin invitation and runs it through sendInvite, which
 * reuses that row (new link, same invitation). Nothing open (already accepted, or never
 * created) is an error, not a new invitation.
 */
export async function resendSchoolAdminInvite(
  tenantId: string,
  deps: InviteDeps & { read: Reader },
): Promise<InviteResult> {
  const { data: school } = await deps.read
    .from("tenants")
    .select("id, name, subdomain, logo_url, primary_color")
    .eq("id", tenantId)
    .maybeSingle();
  if (!school) return { ok: false, code: "school_not_found", message: "school_not_found" };

  const { data: open } = await deps.read
    .from("invitations")
    .select("email")
    .eq("tenant_id", tenantId)
    .eq("role", "school_admin")
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (!open?.email) {
    return { ok: false, code: "no_open_invite", message: "There is no open School Admin invite for this school (already accepted?)." };
  }

  return sendInvite(
    { tenantId, schoolName: school.name, schoolSubdomain: school.subdomain, logoUrl: school.logo_url, primaryColor: school.primary_color,
      email: open.email, role: "school_admin", invitedBy: null },
    deps,
  );
}