"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import type { ActionResult } from "@/lib/academic/schema";
import { brandingColorsSchema } from "@/lib/branding/colors";
import { createAdminClient } from "@/lib/supabase/admin";
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
): Promise<{ tenantId: string; userId: string } | { ok: false; error: string }> {
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

  const { tenantId, app_roles } = readAccessTokenClaims(accessToken);
  if (!tenantId) return fail("This session has no school.");
  if (!app_roles.includes("school_admin")) {
    return fail("Only a school admin can change branding.");
  }
  return { tenantId, userId: userData.user.id };
}

function isTenantFailure(
  value: { tenantId: string; userId: string } | { ok: false; error: string },
): value is { ok: false; error: string } {
  return "ok" in value;
}

const LOGO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const LOGO_LIMIT = 10 * 1024 * 1024;

function safeLogoName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned.slice(0, 80) || "logo";
}

export async function uploadSchoolLogo(
  kind: "logo" | "header",
  file: File,
): Promise<ActionResult> {
  if (!(file instanceof File) || file.size <= 0) return fail("Choose an image to upload.");
  if (file.size > LOGO_LIMIT) return fail("That image is larger than 10 MB.");
  if (!LOGO_TYPES.has(file.type)) return fail("Use a JPEG, PNG, or WebP image.");

  const supabase = await createClient();
  const tenant = await requireSchoolAdmin(supabase);
  if (isTenantFailure(tenant)) return tenant;

  const fileId = crypto.randomUUID();
  const storagePath = `${tenant.tenantId}/branding/${fileId}/${safeLogoName(file.name)}`;
  const uploaded = await supabase.storage.from("tenant-files").upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploaded.error) return fail(uploaded.error.message);

  const inserted = await supabase
    .from("files")
    .insert({
      id: fileId,
      tenant_id: tenant.tenantId,
      storage_path: storagePath,
      original_name: file.name.slice(0, 200),
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: tenant.userId,
    })
    .select("id")
    .returns<{ id: string }[]>();
  if (inserted.error || !inserted.data || inserted.data.length === 0) {
    await supabase.storage.from("tenant-files").remove([storagePath]);
    return fail(inserted.error?.message ?? "The logo was not saved.");
  }

  const column = kind === "header" ? "header_logo_url" : "logo_url";
  // header_logo_url is granted to school admins in migration 0012. The service
  // role writes it so the save works before that migration is applied.
  const updated = await createAdminClient()
    .from("tenants")
    .update({ [column]: storagePath })
    .eq("id", tenant.tenantId)
    .select("id")
    .returns<{ id: string }[]>();
  if (updated.error || !updated.data || updated.data.length === 0) {
    return fail(updated.error?.message ?? "The logo was not saved on the school.");
  }

  revalidateBrand();
  revalidatePath("/admin/branding", "layout");
  revalidatePath("/teacher/home", "layout");
  return { ok: true };
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
