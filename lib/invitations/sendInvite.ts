// US-008b.1: the one function every invite goes through (School Admin, teacher, parent).
//   create or reuse the invitation -> email the link -> set sent_at (only if the email went out)
// Server only: needs the service-role client. The caller must already have checked that the
// signed-in user may invite this role into this school (see resendSchoolAdminInvite below).
import { createHash, randomBytes } from "node:crypto";
import { sendEmail as defaultSend, type EmailSender } from "../email/resend";

export type InviteRole = "school_admin" | "teacher" | "student" | "parent";

// Only the part of the Supabase client we use. Kept loose on purpose: the real client's
// rpc() is heavily generic, and a precise type here makes TypeScript give up (TS2589).
// Results are checked at runtime below.
export interface Rpc {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: (fn: any, args?: any) => PromiseLike<{ data: any; error: { message: string } | null }>;
}

export interface InviteDeps {
  db: Rpc;
  send?: EmailSender;
  /** Builds the link in the email. Default: INVITE_URL_TEMPLATE (see buildAcceptUrl). */
  acceptUrl?: (token: string, schoolSubdomain?: string | null) => string;
  newToken?: () => string;
}

export interface InviteInput {
  tenantId: string;
  schoolName: string;
  /** Only needed if INVITE_URL_TEMPLATE contains {subdomain}. */
  schoolSubdomain?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  email: string;
  role: InviteRole;
  /** profiles.id of the inviter. Leave out for a Platform Admin (they have no profile). */
  invitedBy?: string | null;
  inviterName?: string;
  inviteeName?: string;
  /**
   * US-030: true = create a NEW invitation only. If the person already has an open invite,
   * the database refuses with already_invited and nothing is sent (resend is separate).
   * The database also checks that invitedBy is an active School Admin of this school.
   * Leave out (false) for "create or reuse", which is what a resend uses.
   */
  newOnly?: boolean;
}

export type InviteResult =
  | { ok: true; invitationId: string; reused: boolean; sent: true }
  // The invitation exists but the email did not go out: sent_at stays empty, resend it.
  | { ok: true; invitationId: string; reused: boolean; sent: false; emailError: string }
  | { ok: false; code: string; message: string };

export const hashToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

const defaultToken = () => randomBytes(32).toString("base64url"); // 43 chars; 0016 accepts 20-200
/**
 * The link in the invite email, from the INVITE_URL_TEMPLATE setting. Examples:
 *   https://app.example.com/invite/{token}                 (token in the query)
 *   https://app.example.com/invite/{token}                (token in the path)
 *   https://{subdomain}.example.com/invite/{token}  (the school's own address)
 * Not set: APP_URL + /invite/{token}. The token is URL-encoded for you.
 */
export function buildAcceptUrl(token: string, schoolSubdomain?: string | null, env = process.env): string {
  const template = env.INVITE_URL_TEMPLATE
    ?? `${(env.APP_URL ?? "").replace(/\/$/, "")}/invite/{token}`;
  if (template.includes("{subdomain}") && !schoolSubdomain) {
    throw new Error("INVITE_URL_TEMPLATE needs {subdomain} but no schoolSubdomain was given");
  }
  return template
    .replace("{subdomain}", encodeURIComponent(schoolSubdomain ?? ""))
    .replace("{token}", encodeURIComponent(token));
}

export async function sendInvite(input: InviteInput, deps: InviteDeps): Promise<InviteResult> {
  const send = deps.send ?? defaultSend;
  const token = (deps.newToken ?? defaultToken)();
  const tokenHash = hashToken(token);

  // newOnly: create_school_invitation (0019). Otherwise: upsert_invitation (0018).
  const up = await deps.db.rpc(input.newOnly ? "create_school_invitation" : "upsert_invitation", {
    p_tenant_id: input.tenantId,
    p_email: input.email,
    p_role: input.role,
    p_invited_by: input.invitedBy ?? null,
    p_token_hash: tokenHash,
  });
  if (up.error) {
    // The database errors start with a code, e.g. "already_member: ..." or "school_suspended".
    const m = /^([a-z_]+)/.exec(up.error.message);
    return { ok: false, code: m?.[1] ?? "invite_failed", message: up.error.message };
  }
  const row = (up.data as { invitation_id: string; reused: boolean }[])[0];

  // Same token => same key => Resend will not deliver a retried call twice.
  const mail = await send(
    input.email.trim().toLowerCase(),
    "invite",
    {
      school: { id: input.tenantId, name: input.schoolName, logoUrl: input.logoUrl, primaryColor: input.primaryColor },
      acceptUrl: (deps.acceptUrl ?? buildAcceptUrl)(token, input.schoolSubdomain),
      roleLabel: input.role.replace("_", " "),
      inviterName: input.inviterName,
      inviteeName: input.inviteeName,
    },
    `invite-${row.invitation_id}-${tokenHash.slice(0, 16)}`,
  );
  if (!mail.ok) {
    return { ok: true, invitationId: row.invitation_id, reused: row.reused, sent: false, emailError: mail.error };
  }

  const mark = await deps.db.rpc("mark_invitation_sent", { p_invitation_id: row.invitation_id, p_token_hash: tokenHash });
  if (mark.error) {
    // The email is out but we could not record it. Resending is safe (new link, old one dies).
    return { ok: true, invitationId: row.invitation_id, reused: row.reused, sent: false, emailError: "sent_at_not_saved" };
  }
  return { ok: true, invitationId: row.invitation_id, reused: row.reused, sent: true };
}