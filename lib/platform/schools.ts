import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionStatus } from "@/lib/stubs/get-tenants";

export type SchoolRow = {
  id: string;
  name: string;
  subdomain: string;
  subscription_status: string;
  onboarding_status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, SubscriptionStatus> = {
  trial: "Trial",
  active: "Active",
  suspended: "Suspended",
  cancelled: "Cancelled",
};

export function subscriptionLabel(value: string): SubscriptionStatus {
  return STATUS_LABEL[value] ?? "Trial";
}

export async function assertPlatformAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) notFound();

  const admin = createAdminClient();
  const row = await admin
    .from("platform_admins")
    .select("id")
    .eq("id", data.user.id)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>();
  if (row.error || !row.data) notFound();
}

export async function listSchools(): Promise<SchoolRow[]> {
  const admin = createAdminClient();
  const result = await admin
    .from("tenants")
    .select("id, name, subdomain, subscription_status, onboarding_status, created_at")
    .order("created_at", { ascending: false })
    .returns<SchoolRow[]>();
  if (result.error) throw new Error(`tenants: ${result.error.message}`);
  return result.data ?? [];
}

export async function getSchool(id: string): Promise<SchoolRow | null> {
  const admin = createAdminClient();
  const result = await admin
    .from("tenants")
    .select("id, name, subdomain, subscription_status, onboarding_status, created_at")
    .eq("id", id)
    .maybeSingle<SchoolRow>();
  if (result.error) throw new Error(`tenants: ${result.error.message}`);
  return result.data;
}

export type SubscriptionAudit = {
  id: string;
  created_at: string;
  from: string;
  to: string;
};

export async function subscriptionHistory(tenantId: string): Promise<SubscriptionAudit[]> {
  const admin = createAdminClient();
  const result = await admin
    .from("audit_log")
    .select("id, created_at, details")
    .eq("tenant_id", tenantId)
    .eq("action", "tenant.update")
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<{ id: string; created_at: string; details: { from?: string; to?: string } | null }[]>();
  if (result.error) throw new Error(`audit_log: ${result.error.message}`);
  return (result.data ?? []).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    from: subscriptionLabel(row.details?.from ?? ""),
    to: subscriptionLabel(row.details?.to ?? ""),
  }));
}
