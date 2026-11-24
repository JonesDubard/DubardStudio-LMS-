"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { firstZodMessage } from "@/lib/academic/schema";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import {
  inviteTeacher as inviteTeacherFor,
  resendTeacherInvite as resendTeacherInviteFor,
  teacherInviteError,
  TEACHER_INVITE_NOT_SENT,
  type Caller,
} from "@/lib/invitations/teacherInvite";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email("Enter a valid email address.").max(320);

const inviteRoles = ["teacher", "student", "school_admin", "parent"] as const;
export type InviteRole = (typeof inviteRoles)[number];

export type InviteTeacherResult = { ok: true; notice?: string } | { ok: false; error: string };

function fail(error: string): InviteTeacherResult {
  return { ok: false, error };
}

async function currentCaller(): Promise<Caller | null> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) return null;

  const claims = readAccessTokenClaims(accessToken);
  return { userId: userData.user.id, tenantId: claims.tenantId, roles: claims.app_roles };
}

export async function inviteTeacher(email: string): Promise<InviteTeacherResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const caller = await currentCaller();
  if (!caller) return fail("You need to sign in again.");

  const admin = createAdminClient();
  const result = await inviteTeacherFor(caller, parsed.data, { db: admin, read: admin });
  if (!result.ok) {
    const message = teacherInviteError(result.code);
    if (message === teacherInviteError("")) console.error("teacher invite failed", result.code);
    return fail(message);
  }

  revalidatePath("/admin/people/teachers");
  if (!result.sent) return { ok: true, notice: TEACHER_INVITE_NOT_SENT };
  return { ok: true, notice: `Invite sent to ${parsed.data.toLowerCase()}.` };
}

export async function resendTeacherInvite(invitationId: string): Promise<InviteTeacherResult> {
  if (!z.string().uuid().safeParse(invitationId).success) {
    return fail(teacherInviteError("no_open_invite"));
  }

  const caller = await currentCaller();
  if (!caller) return fail("You need to sign in again.");

  const admin = createAdminClient();
  const result = await resendTeacherInviteFor(caller, invitationId, { db: admin, read: admin });
  if (!result.ok) return fail(teacherInviteError(result.code));
  if (!result.sent) return fail("The email did not go out. Try again in a moment.");

  revalidatePath("/admin/people/teachers");
  return { ok: true, notice: "Invite sent again. The old link no longer works." };
}

export async function invitePerson(
  email: string,
  role: InviteRole,
): Promise<InviteTeacherResult> {
  if (role === "teacher") return inviteTeacher(email);
  if (role === "school_admin") {
    return fail("Only the platform team can add a School Admin. Contact support to add one.");
  }

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));
  if (!inviteRoles.includes(role)) return fail("That role cannot be invited.");

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return fail("You need to sign in again.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) return fail("You need to sign in again.");

  const claims = readAccessTokenClaims(accessToken);
  if (!claims.tenantId || !claims.app_roles.includes("school_admin")) {
    return fail("Only a school admin can send an invitation.");
  }

  const tokenHash = createHash("sha256").update(randomBytes(32)).digest("hex");
  const admin = createAdminClient();
  const { error } = await admin.from("invitations").insert({
    tenant_id: claims.tenantId,
    email: parsed.data.toLowerCase(),
    role,
    invited_by: userData.user.id,
    token_hash: tokenHash,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return fail("An invite for that email and role is already pending.");
    }
    return fail(error.message);
  }

  revalidatePath("/admin/people/teachers");
  revalidatePath("/admin/people/students");
  revalidatePath("/admin/people/admins");
  revalidatePath("/admin/people/parents");
  return { ok: true };
}
