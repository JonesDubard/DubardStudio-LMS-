"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionStatus } from "@/lib/stubs/get-tenants";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const STATUS_TO_DB: Record<SubscriptionStatus, string> = {
  Trial: "trial",
  Active: "active",
  Suspended: "suspended",
  Cancelled: "cancelled",
};

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function provisionError(message: string): string {
  if (message.includes("subdomain_taken")) return "That subdomain is already used.";
  if (message.includes("reserved_subdomain")) return "That subdomain is reserved.";
  if (message.includes("invalid_subdomain")) {
    return "Use 3–30 lowercase letters, digits, or hyphens, with no hyphen at either end.";
  }
  if (message.includes("invalid_contact")) return "Enter a contact name and a valid email.";
  if (message.includes("invalid_name")) return "Enter a school name.";
  if (message.includes("not_platform_admin")) return "Only a platform admin can create a school.";
  return "The school was not created.";
}

async function requirePlatformAdmin(): Promise<
  { userId: string; admin: ReturnType<typeof createAdminClient> } | ActionResult
> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return fail("You need to sign in again.");

  const admin = createAdminClient();
  const row = await admin
    .from("platform_admins")
    .select("id")
    .eq("id", data.user.id)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>();
  if (row.error) return fail("The platform admin check failed.");
  if (!row.data) return fail("Only a platform admin can do that.");
  return { userId: data.user.id, admin };
}

function isDenied(
  value: { userId: string; admin: ReturnType<typeof createAdminClient> } | ActionResult,
): value is ActionResult {
  return "ok" in value;
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Enter a school name.").max(200),
  subdomain: z.string().trim().min(1, "Enter a subdomain.").max(30),
  contactName: z.string().trim().min(1, "Enter a contact name.").max(200),
  contactEmail: z.string().trim().email("Enter a valid contact email.").max(320),
});

export async function createTenant(input: {
  name: string;
  subdomain: string;
  contactName: string;
  contactEmail: string;
}): Promise<ActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  const session = await requirePlatformAdmin();
  if (isDenied(session)) return session;

  const created = await session.admin.rpc("provision_tenant", {
    p_name: parsed.data.name,
    p_subdomain: parsed.data.subdomain,
    p_contact_name: parsed.data.contactName,
    p_contact_email: parsed.data.contactEmail,
    p_actor_id: session.userId,
  });
  if (created.error) return fail(provisionError(created.error.message));
  if (typeof created.data !== "string") return fail("The school was not created.");

  revalidatePath("/platform/tenants");
  return { ok: true, id: created.data };
}

export async function updateTenantSubscription(
  tenantId: string,
  status: SubscriptionStatus,
): Promise<ActionResult> {
  const next = STATUS_TO_DB[status];
  if (!next) return fail("Choose a subscription status.");
  if (!z.string().uuid().safeParse(tenantId).success) return fail("That school was not found.");

  const session = await requirePlatformAdmin();
  if (isDenied(session)) return session;

  const current = await session.admin
    .from("tenants")
    .select("subscription_status")
    .eq("id", tenantId)
    .maybeSingle<{ subscription_status: string }>();
  if (current.error) return fail("That school was not found.");
  if (!current.data) return fail("That school was not found.");
  if (current.data.subscription_status === next) return fail("That status is already set.");

  const updated = await session.admin
    .from("tenants")
    .update({ subscription_status: next })
    .eq("id", tenantId)
    .select("id")
    .returns<{ id: string }[]>();
  if (updated.error || !updated.data || updated.data.length === 0) {
    return fail("The subscription was not updated.");
  }

  const audited = await session.admin.from("audit_log").insert({
    actor_id: session.userId,
    actor_kind: "platform_admin",
    tenant_id: tenantId,
    action: "tenant.update",
    resource_type: "tenant",
    resource_id: tenantId,
    details: { from: current.data.subscription_status, to: next },
  });
  if (audited.error) return fail("The status changed, but the audit record was not saved.");

  revalidatePath("/platform/tenants");
  revalidatePath(`/platform/tenants/${tenantId}/subscription`);
  return { ok: true };
}
