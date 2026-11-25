import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SubscriptionStatus = "Trial" | "Active" | "Suspended" | "Cancelled";

export type SchoolRow = {
  id: string;
  name: string;
  subdomain: string;
  subscription_status: string;
  onboarding_status: string;
  created_at: string;
};

export type SchoolDetail = SchoolRow & {
  contact_name: string | null;
  contact_email: string | null;
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

export async function getSchool(id: string): Promise<SchoolDetail | null> {
  const admin = createAdminClient();
  const result = await admin
    .from("tenants")
    .select(
      "id, name, subdomain, subscription_status, onboarding_status, created_at, contact_name, contact_email",
    )
    .eq("id", id)
    .maybeSingle<SchoolDetail>();
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

export type PendingSchoolAdminInvite = {
  id: string;
  email: string | null;
  created_at: string;
  sent_at: string | null;
  expires_at: string;
};

export async function listPendingSchoolAdminInvites(
  tenantId: string,
): Promise<PendingSchoolAdminInvite[]> {
  const admin = createAdminClient();
  const result = await admin
    .from("invitations")
    .select("id, email, created_at, sent_at, expires_at")
    .eq("tenant_id", tenantId)
    .eq("role", "school_admin")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<PendingSchoolAdminInvite[]>();
  if (result.error) throw new Error(`invitations: ${result.error.message}`);
  return result.data ?? [];
}

export type SchoolAdminRow = {
  profileId: string;
  name: string;
  email: string;
  status: string;
};


export async function listSchoolAdmins(tenantId: string): Promise<SchoolAdminRow[]> {
  const admin = createAdminClient();
  const memberships = await admin
    .from("memberships")
    .select("profile_id, status")
    .eq("tenant_id", tenantId)
    .eq("role", "school_admin")
    .neq("status", "removed")
    .limit(100)
    .returns<{ profile_id: string; status: string }[]>();
  if (memberships.error) throw new Error(`memberships: ${memberships.error.message}`);
  const rows = memberships.data ?? [];
  if (rows.length === 0) return [];

  const profiles = await admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("tenant_id", tenantId)
    .in("id", rows.map((row) => row.profile_id))
    .returns<{ id: string; full_name: string | null; email: string }[]>();
  if (profiles.error) throw new Error(`profiles: ${profiles.error.message}`);
  const byId = new Map((profiles.data ?? []).map((row) => [row.id, row]));

  return rows
    .map((row) => ({
      profileId: row.profile_id,
      name: byId.get(row.profile_id)?.full_name?.trim() || "School Admin",
      email: byId.get(row.profile_id)?.email ?? "",
      status: row.status,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
