"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import type { ActionResult } from "@/lib/academic/schema";
import { brandingColorsSchema } from "@/lib/branding/colors";
import { createClient } from "@/lib/supabase/server";

const BRAND_PATHS = [
  "/feed",
  "/teacher/home",
  "/admin/dashboard",
  "/admin/branding",
] as const;

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function revalidateBrand() {
  for (const path of BRAND_PATHS) {
    revalidatePath(path);
  }
}

/**
 * Same claim read as academic actions. Branding updates the tenants row whose
 * id is this claim. It does not filter a tenant_id column.
 */
async function requireSchoolAdmin(
  supabase: SupabaseClient,
): Promise<{ tenantId: string } | { ok: false; error: string }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return fail("You need to sign in again.");
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) {
    return fail("You need to sign in again.");
  }

  const { tenantId, app_role } = readAccessTokenClaims(accessToken);
  if (!tenantId) return fail("This session has no school.");
  if (app_role !== "school_admin") {
    return fail("Only a school admin can change branding.");
  }
  return { tenantId };
}

function isTenantFailure(
  value: { tenantId: string } | { ok: false; error: string },
): value is { ok: false; error: string } {
  return "ok" in value;
}

async function writeColors(
  primary: string | null,
  secondary: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const tenant = await requireSchoolAdmin(supabase);
  if (isTenantFailure(tenant)) return tenant;

  const { data, error } = await supabase
    .from("tenants")
    .update({
      primary_color: primary,
      secondary_color: secondary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenant.tenantId)
    .select("id")
    .returns<{ id: string }[]>();

  if (error) {
    if (error.message.toLowerCase().includes("row-level security")) {
      return fail("You do not have access to that school.");
    }
    return fail(error.message);
  }
  if (!data || data.length === 0) {
    return fail("Branding was not saved.");
  }

  revalidateBrand();
  return { ok: true };
}

export async function updateBranding(
  primaryColor: string,
  secondaryColor: string,
): Promise<ActionResult> {
  const parsed = brandingColorsSchema.safeParse({ primaryColor, secondaryColor });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Enter a hex color like #1E40AF.");
  }

  return writeColors(parsed.data.primaryColor, parsed.data.secondaryColor);
}

/** Stores NULL so the layout fallback paints the neutral default theme. */
export async function resetBranding(): Promise<ActionResult> {
  return writeColors(null, null);
}
