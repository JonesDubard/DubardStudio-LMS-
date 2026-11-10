"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { firstZodMessage } from "@/lib/academic/schema";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email("Enter a valid email address.").max(320);

export type InviteTeacherResult = { ok: true } | { ok: false; error: string };

function fail(error: string): InviteTeacherResult {
  return { ok: false, error };
}

/** Creates a pending teacher invitation. Does not send email or reveal the token. */
export async function inviteTeacher(email: string): Promise<InviteTeacherResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return fail("You need to sign in again.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) return fail("You need to sign in again.");

  const claims = readAccessTokenClaims(accessToken);
  if (!claims.tenantId || !claims.app_roles.includes("school_admin")) {
    return fail("Only a school admin can invite a teacher.");
  }

  const tokenHash = createHash("sha256").update(randomBytes(32)).digest("hex");
  const admin = createAdminClient();
  const { error } = await admin.from("invitations").insert({
    tenant_id: claims.tenantId,
    email: parsed.data.toLowerCase(),
    role: "teacher",
    invited_by: userData.user.id,
    token_hash: tokenHash,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return fail("An invite for that teacher is already pending.");
    }
    return fail(error.message);
  }

  revalidatePath("/admin/people/teachers");
  return { ok: true };
}
