"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { firstZodMessage } from "@/lib/academic/schema";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required.").max(200),
  email: z.string().trim().email("Enter a valid email address.").max(320),
  // Optional: leave it out to keep the saved phone, send "" to clear it.
  phone: z
    .string()
    .trim()
    .max(30, "Enter a shorter phone number.")
    .regex(/^[+0-9 ()-]*$/, "Use digits, spaces, + ( ) or - in the phone number.")
    .optional(),
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
  phone?: string;
}): Promise<ProfileUpdateResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return fail("You need to sign in again.");

  const fullName = parsed.data.fullName;
  const email = parsed.data.email.toLowerCase();
  const currentEmail = (userData.user.email ?? "").toLowerCase();

  // Only the columns a signed-in user may change (full_name, phone, photo_file_id).
  // The database refuses anything else, and refuses any row that is not their own.
  const changes: { full_name: string; phone?: string | null } = { full_name: fullName };
  if (parsed.data.phone !== undefined) {
    changes.phone = parsed.data.phone === "" ? null : parsed.data.phone;
  }

  const { data: rows, error: profileError } = await supabase
    .from("profiles")
    .update(changes)
    .eq("id", userData.user.id)
    .select("id")
    .returns<{ id: string }[]>();

  if (profileError) {
    return fail(
      profileError.message.toLowerCase().includes("row-level security")
        ? "You do not have access to that profile."
        : profileError.message,
    );
  }
  if (!rows || rows.length === 0) {
    return fail("This account has no school profile.");
  }

  // The login address changes only through Supabase Auth, which sends a confirmation
  // to the new address. The database copies the confirmed address to profiles.email
  // (trigger on auth.users), so this code never writes profiles.email.
  let notice = "Saved.";
  if (email !== currentEmail) {
    const { data: updated, error: emailError } = await supabase.auth.updateUser({ email });
    if (emailError) {
      return fail(`Your details were saved, but the login address was not. ${emailError.message}`);
    }
    const pending =
      Boolean(updated.user?.new_email) ||
      (updated.user?.email ?? "").toLowerCase() !== email;
    if (pending) {
      notice = "Your details were saved. Check your inbox to confirm the new login address.";
    }
  }

  revalidatePath("/settings");
  revalidatePath("/feed");
  revalidatePath("/teacher/home");
  revalidatePath("/parent/home");
  revalidatePath("/parent/assignments");
  revalidatePath("/parent/grades");
  revalidatePath("/admin/dashboard");
  return { ok: true, notice };
}