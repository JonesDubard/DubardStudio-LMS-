import { createHash, randomBytes } from "node:crypto";
import { sendEmail as defaultSend, type EmailSender } from "../email/resend";

export type InviteRole = "school_admin" | "teacher" | "student" | "parent";
export interface Rpc {
  rpc: (fn: any, args?: any) => PromiseLike<{ data: any; error: { message: string } | null }>;
}

export interface InviteDeps {
  db: Rpc;
  send?: EmailSender;
  acceptUrl?: (token: string, schoolSubdomain?: string | null) => string;
  newToken?: () => string;
}

export interface InviteInput {
  tenantId: string;
  schoolName: string;
  schoolSubdomain?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  email: string;
  role: InviteRole;
  invitedBy?: string | null;
  inviterName?: string;
  inviteeName?: string;
  newOnly?: boolean;
}

export type InviteResult =
  | { ok: true; invitationId: string; reused: boolean; sent: true }
  | { ok: true; invitationId: string; reused: boolean; sent: false; emailError: string }
  | { ok: false; code: string; message: string };

export const hashToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

const defaultToken = () => randomBytes(32).toString("base64url");
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

  const up = await deps.db.rpc(input.newOnly ? "create_school_invitation" : "upsert_invitation", {
    p_tenant_id: input.tenantId,
    p_email: input.email,
    p_role: input.role,
    p_invited_by: input.invitedBy ?? null,
    p_token_hash: tokenHash,
  });
  if (up.error) {
    const m = /^([a-z_]+)/.exec(up.error.message);
    return { ok: false, code: m?.[1] ?? "invite_failed", message: up.error.message };
  }
  const row = (up.data as { invitation_id: string; reused: boolean }[])[0];

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
    return { ok: true, invitationId: row.invitation_id, reused: row.reused, sent: false, emailError: "sent_at_not_saved" };
  }
  return { ok: true, invitationId: row.invitation_id, reused: row.reused, sent: true };
}