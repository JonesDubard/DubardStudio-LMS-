import { sendInvite, type InviteDeps, type InviteResult } from "./sendInvite";

export interface Caller {
  userId: string;
  tenantId: string | null;
  roles: string[];
}

type Reader = { from: (table: any) => any };

export type TeacherInviteDeps = InviteDeps & { read: Reader };

type SchoolRow = {
  name: string;
  subdomain: string | null;
  logo_url: string | null;
  primary_color: string | null;
};

const refuse = (code: string): InviteResult => ({ ok: false, code, message: code });

function isSchoolAdmin(caller: Caller): caller is Caller & { tenantId: string } {
  return Boolean(caller.tenantId) && caller.roles.includes("school_admin");
}

async function loadSchool(tenantId: string, read: Reader): Promise<SchoolRow | null> {
  const { data } = await read
    .from("tenants")
    .select("name, subdomain, logo_url, primary_color")
    .eq("id", tenantId)
    .maybeSingle();
  return (data as SchoolRow | null) ?? null;
}

async function loadName(userId: string, read: Reader): Promise<string | undefined> {
  const { data } = await read.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return (data as { full_name?: string } | null)?.full_name ?? undefined;
}


export async function inviteTeacher(
  caller: Caller,
  email: string,
  deps: TeacherInviteDeps,
): Promise<InviteResult> {
  if (!isSchoolAdmin(caller)) return refuse("not_school_admin");

  const school = await loadSchool(caller.tenantId, deps.read);
  if (!school) return refuse("school_not_found");

  return sendInvite(
    {
      tenantId: caller.tenantId,
      schoolName: school.name,
      schoolSubdomain: school.subdomain,
      logoUrl: school.logo_url,
      primaryColor: school.primary_color,
      email,
      role: "teacher",
      invitedBy: caller.userId,
      inviterName: await loadName(caller.userId, deps.read),
      newOnly: true,
    },
    deps,
  );
}

export async function resendTeacherInvite(
  caller: Caller,
  invitationId: string,
  deps: TeacherInviteDeps,
): Promise<InviteResult> {
  if (!isSchoolAdmin(caller)) return refuse("not_school_admin");


  const { data: me } = await deps.read
    .from("memberships")
    .select("id")
    .eq("profile_id", caller.userId)
    .eq("tenant_id", caller.tenantId)
    .eq("role", "school_admin")
    .eq("status", "active")
    .maybeSingle();
  if (!me) return refuse("not_school_admin");

  const { data: open } = await deps.read
    .from("invitations")
    .select("email")
    .eq("id", invitationId)
    .eq("tenant_id", caller.tenantId)
    .eq("role", "teacher")
    .eq("status", "pending")
    .maybeSingle();
  const openEmail = (open as { email?: string | null } | null)?.email;
  if (!openEmail) return refuse("no_open_invite");

  const school = await loadSchool(caller.tenantId, deps.read);
  if (!school) return refuse("school_not_found");

  return sendInvite(
    {
      tenantId: caller.tenantId,
      schoolName: school.name,
      schoolSubdomain: school.subdomain,
      logoUrl: school.logo_url,
      primaryColor: school.primary_color,
      email: openEmail,
      role: "teacher",
      invitedBy: caller.userId,
      inviterName: await loadName(caller.userId, deps.read),
    },
    deps,
  );
}

export function teacherInviteError(code: string): string {
  switch (code) {
    case "not_school_admin":
      return "Only a School Admin of this school can invite teachers.";
    case "already_invited":
      return "This person already has an open invite. Use Resend under Pending invitations to send it again.";
    case "already_member":
      return "This person is already a teacher at your school.";
    case "invalid_email":
      return "Enter a valid email address.";
    case "school_suspended":
      return "Your school is suspended, so no invite can be sent.";
    case "school_cancelled":
      return "Your school is cancelled, so no invite can be sent.";
    case "no_open_invite":
      return "That invite is no longer open. The teacher may have accepted it already.";
    case "school_not_found":
      return "Your school was not found. Sign in again.";
    default:
      return "The invite was not sent. Try again in a moment.";
  }
}

export const TEACHER_INVITE_NOT_SENT =
  "The invite was saved, but the email did not go out. Use Resend under Pending invitations.";
