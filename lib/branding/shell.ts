import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_BRAND_PRIMARY,
  DEFAULT_BRAND_SECONDARY,
  brandColorOrDefault,
} from "@/lib/branding/colors";

export type ShellBrand = {
  schoolName: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  primary: string;
  secondary: string;
  logoUrl: string | null;
};

const fallback: ShellBrand = {
  schoolName: null,
  primaryColor: null,
  secondaryColor: null,
  primary: DEFAULT_BRAND_PRIMARY,
  secondary: DEFAULT_BRAND_SECONDARY,
  logoUrl: null,
};

async function displayLogoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  headerPath: string | null,
  logoPath: string | null,
): Promise<string | null> {
  const stored = headerPath || logoPath;
  if (!stored) return null;
  if (stored.startsWith("http://") || stored.startsWith("https://")) return stored;

  const signed = await supabase.storage.from("tenant-files").createSignedUrl(stored, 60 * 60);
  return signed.data?.signedUrl ?? null;
}

/**
 * Reads the signed-in school's colors for the HTML shell.
 * The tenant id comes from the middleware JWT header. The tenants row key is id.
 */
export const readShellBrand = cache(async (): Promise<ShellBrand> => {
  try {
    const headerStore = await headers();
    const tenantId = headerStore.get("x-tenant-id");
    if (!tenantId) return fallback;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenants")
      .select("name, primary_color, secondary_color, logo_url, header_logo_url")
      .eq("id", tenantId)
      .maybeSingle();

    if (error || !data) return fallback;

    const primaryColor =
      typeof data.primary_color === "string" ? data.primary_color : null;
    const secondaryColor =
      typeof data.secondary_color === "string" ? data.secondary_color : null;
    const headerPath = typeof data.header_logo_url === "string" ? data.header_logo_url : null;
    const logoPath = typeof data.logo_url === "string" ? data.logo_url : null;

    return {
      schoolName: typeof data.name === "string" ? data.name : null,
      primaryColor,
      secondaryColor,
      primary: brandColorOrDefault(primaryColor, DEFAULT_BRAND_PRIMARY),
      secondary: brandColorOrDefault(secondaryColor, DEFAULT_BRAND_SECONDARY),
      logoUrl: await displayLogoUrl(supabase, headerPath, logoPath),
    };
  } catch {
    return fallback;
  }
});
