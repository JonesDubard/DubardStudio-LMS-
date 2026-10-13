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
};

const fallback: ShellBrand = {
  schoolName: null,
  primaryColor: null,
  secondaryColor: null,
  primary: DEFAULT_BRAND_PRIMARY,
  secondary: DEFAULT_BRAND_SECONDARY,
};

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
      .select("name, primary_color, secondary_color")
      .eq("id", tenantId)
      .maybeSingle();

    if (error || !data) return fallback;

    const primaryColor =
      typeof data.primary_color === "string" ? data.primary_color : null;
    const secondaryColor =
      typeof data.secondary_color === "string" ? data.secondary_color : null;

    return {
      schoolName: typeof data.name === "string" ? data.name : null,
      primaryColor,
      secondaryColor,
      primary: brandColorOrDefault(primaryColor, DEFAULT_BRAND_PRIMARY),
      secondary: brandColorOrDefault(secondaryColor, DEFAULT_BRAND_SECONDARY),
    };
  } catch {
    return fallback;
  }
});
