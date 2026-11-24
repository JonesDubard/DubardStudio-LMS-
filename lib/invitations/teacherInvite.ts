// US-030: a School Admin invites a teacher by email, and can resend a teacher's open invite.
// Both go through sendInvite() from US-008b, so the email, the link and sent_at work the
// same way as the first School Admin invite.
// Server only: deps.db and deps.read must be the service-role client. The caller comes
// from the signed-in user's token (see app/(admin)/admin/people/teachers/actions.ts).
import { sendInvite, type InviteDeps, type InviteResult } from "./sendInvite";

/** Who is asking, read from their sign-in token. */
export interface Caller {
  userId: string;
  tenantId: string | null;
  roles: string[];
}

// The part of the Supabase client used for reading (kept loose, see Rpc in sendInvite.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reader = { from: (table: any) => any };

export type TeacherInviteDeps = InviteDeps & { read: Reader };

type SchoolRow = {
  name: string;
  subdomain: string | null;
  logo_url: string | null;
  primary_color: string | null;
};

const refuse = (code: string): InviteResult => ({ ok: false, code, message: code });

/** First check, in the app: the token says School Admin, with a school. */
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

/**
 * US-030.1 + US-030.2: invite one teacher into the caller's own school.
 * Creates a NEW invitation only (newOnly). If the email already has an open teacher invite,
 * or is already a teacher here, the database refuses (already_invited / already_member)
 * and no email is sent. The database also checks again that the caller is an active
 * School Admin of this school (0019), so a stale token cannot slip through.
 */
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
      tenantId: caller.tenantId, // always the admin's own school, never one from the browser
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

/**
 * "Resend" on a pending teacher invite: same invitation, new link (the old link stops
 * working), fresh 7 days. Only for an open teacher invite of the caller's own school.
 */
export async function resendTeacherInvite(
  caller: Caller,
  invitationId: string,
  deps: TeacherInviteDeps,
): Promise<InviteResult> {
  if (!isSchoolAdmin(caller)) return refuse("not_school_admin");

  // The resend path (upsert_invitation) does not check the inviter in the database,
  // so check here that the caller is still an active School Admin of this school.
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
    .eq("tenant_id", caller.tenantId) // another school's invite is simply "not found"
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
      // newOnly left out: "create or reuse", so it reuses the open invitation
    },
    deps,
  );
}

/** The sentence a School Admin sees for each refusal code. */
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

/** Shown when the invitation was saved but the email did not go out. */
export const TEACHER_INVITE_NOT_SENT =
  "The invite was saved, but the email did not go out. Use Resend under Pending invitations.";
