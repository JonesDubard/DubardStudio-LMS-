"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { firstZodMessage } from "@/lib/academic/schema";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required.").max(200),
  email: z.string().trim().email("Enter a valid email address.").max(320),
});

export type ProfileUpdateResult =
  | { ok: true; notice: string }
  | { ok: false; error: string };

function fail(error: string): ProfileUpdateResult {
  return { ok: false, error };
}

export async function updateProfile(input: {
  fullName: string;
  email: string;
}): Promise<ProfileUpdateResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return fail("You need to sign in again.");

  const fullName = parsed.data.fullName;
  const email = parsed.data.email.toLowerCase();
  const currentEmail = (userData.user.email ?? "").toLowerCase();

  const { data: nameRows, error: nameError } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userData.user.id)
    .select("id")
    .returns<{ id: string }[]>();

  if (nameError) {
    return fail(
      nameError.message.toLowerCase().includes("row-level security")
        ? "You do not have access to that profile."
        : nameError.message,
    );
  }
  if (!nameRows || nameRows.length === 0) {
    return fail("This account has no school profile.");
  }

  if (email !== currentEmail) {
    const { data: updated, error: emailError } = await supabase.auth.updateUser({
      email,
    });
    if (emailError) {
      return fail(`Your name was saved, but the login address was not. ${emailError.message}`);
    }

    const pending =
      Boolean(updated.user?.new_email) ||
      (updated.user?.email ?? "").toLowerCase() !== email;
    if (pending) {
      revalidatePath("/settings");
      return {
        ok: true,
        notice: "Your name was saved. Check your inbox to confirm the new login address.",
      };
    }

    const { data: emailRows, error: profileEmailError } = await supabase
      .from("profiles")
      .update({ email })
      .eq("id", userData.user.id)
      .select("id")
      .returns<{ id: string }[]>();
    if (profileEmailError) {
      return fail(
        `Your login address was updated, but the profile copy was not. ${profileEmailError.message}`,
      );
    }
    if (!emailRows || emailRows.length === 0) {
      return fail("Your login address was updated, but the profile copy was not saved.");
    }
  }

  revalidatePath("/settings");
  revalidatePath("/feed");
  revalidatePath("/teacher/home");
  revalidatePath("/parent/home");
  revalidatePath("/admin/dashboard");
  return { ok: true, notice: "Saved." };
}
