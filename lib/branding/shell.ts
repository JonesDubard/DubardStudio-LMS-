import { cache } from "react";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
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
  schoolLogoUrl: string | null;
};

const fallback: ShellBrand = {
  schoolName: null,
  primaryColor: null,
  secondaryColor: null,
  primary: DEFAULT_BRAND_PRIMARY,
  secondary: DEFAULT_BRAND_SECONDARY,
  logoUrl: null,
  schoolLogoUrl: null,
};

type TenantBrandRow = {
  id: string;
  name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  header_logo_url: string | null;
};

function parsePublicBrandRow(value: unknown): TenantBrandRow | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== "object" || first === null) return null;

  const row = first as Record<string, unknown>;
  if (typeof row.tenant_id !== "string") return null;
  return {
    id: row.tenant_id,
    name: typeof row.name === "string" ? row.name : null,
    primary_color:
      typeof row.primary_color === "string" ? row.primary_color : null,
    secondary_color:
      typeof row.secondary_color === "string" ? row.secondary_color : null,
    logo_url: typeof row.logo_url === "string" ? row.logo_url : null,
    header_logo_url:
      typeof row.header_logo_url === "string" ? row.header_logo_url : null,
  };
}

async function displayLogoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  headerPath: string | null,
  logoPath: string | null,
): Promise<string | null> {
  const stored = headerPath || logoPath;
  if (!stored) return null;
  if (stored.startsWith("http://") || stored.startsWith("https://")) return stored;

  if (!stored.startsWith(`${tenantId}/branding/`)) {
    console.error("School logo path is outside its tenant branding folder.");
    return null;
  }

  const signed = await supabase.storage.from("tenant-files").createSignedUrl(stored, 60 * 60);
  if (!signed.error) return signed.data?.signedUrl ?? null;

  try {
    const adminClient = createAdminClient();
    const adminSigned = await adminClient.storage
      .from("tenant-files")
      .createSignedUrl(stored, 60 * 60);
    if (!adminSigned.error) return adminSigned.data?.signedUrl ?? null;
    console.error("Could not create a signed URL for the school logo.");
  } catch (error) {
    console.error("Could not sign the public school logo.", error);
    return null;
  }
  return null;
}

async function toShellBrand(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: TenantBrandRow,
): Promise<ShellBrand> {
  const schoolLogoUrl = await displayLogoUrl(
    supabase,
    row.id,
    null,
    row.logo_url,
  );
  const shellLogoUrl =
    row.header_logo_url && row.header_logo_url !== row.logo_url
      ? await displayLogoUrl(supabase, row.id, row.header_logo_url, row.logo_url)
      : schoolLogoUrl;
  return {
    schoolName: row.name,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    primary: brandColorOrDefault(row.primary_color, DEFAULT_BRAND_PRIMARY),
    secondary: brandColorOrDefault(row.secondary_color, DEFAULT_BRAND_SECONDARY),
    logoUrl: shellLogoUrl,
    schoolLogoUrl,
  };
}

/**
 * Reads tenant branding from the authenticated tenant id or the public subdomain
 * lookup injected by middleware before sign-in.
 */
export const readShellBrand = cache(async (): Promise<ShellBrand> => {
  const headerStore = await headers();
  const tenantId = headerStore.get("x-tenant-id");
  const subdomain = headerStore.get("x-tenant-subdomain");
  if (!tenantId && !subdomain) return fallback;

  try {
    const supabase = await createClient();
    if (tenantId) {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, primary_color, secondary_color, logo_url, header_logo_url")
        .eq("id", tenantId)
        .maybeSingle<TenantBrandRow>();
      if (error) {
        console.error("Could not read authenticated school branding.");
        return fallback;
      }
      return data ? toShellBrand(supabase, data) : fallback;
    }

    if (!subdomain) return fallback;
    const { data, error } = await supabase.rpc("get_branding", {
      p_subdomain: subdomain,
    });
    if (error) {
      console.error("Could not read public school branding.");
      return fallback;
    }
    const row = parsePublicBrandRow(data);
    return row ? toShellBrand(supabase, row) : fallback;
  } catch (error) {
    console.error("Could not load school branding.", error);
    return fallback;
  }
});
