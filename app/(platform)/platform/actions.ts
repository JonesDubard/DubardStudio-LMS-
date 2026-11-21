"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionStatus } from "@/lib/platform/schools";

type ActionResult =
  { ok: true; id?: string; inviteLink?: string } | { ok: false; error: string };

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
  if (message.includes("subdomain_taken"))
    return "That subdomain is already used.";
  if (message.includes("reserved_subdomain"))
    return "That subdomain is reserved.";
  if (message.includes("invalid_subdomain")) {
    return "Use 3–30 lowercase letters, digits, or hyphens, with no hyphen at either end.";
  }
  if (message.includes("invalid_contact"))
    return "Enter a contact name and a valid email.";
  if (message.includes("invalid_name")) return "Enter a school name.";
  if (message.includes("not_platform_admin"))
    return "Only a platform admin can create a school.";
  return "The school was not created.";
}

function schoolChangeError(message: string, fallback: string): string {
  if (message.includes("school_not_found")) return "That school was not found.";
  if (message.includes("invalid_status"))
    return "Choose a subscription status.";
  if (message.includes("invalid_contact"))
    return "Enter a contact name and a valid email.";
  if (message.includes("not_platform_admin"))
    return "Only a platform admin can do that.";
  return fallback;
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
  value:
    | { userId: string; admin: ReturnType<typeof createAdminClient> }
    | ActionResult,
): value is ActionResult {
  return "ok" in value;
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Enter a school name.").max(200),
  subdomain: z.string().trim().min(1, "Enter a subdomain.").max(30),
  contactName: z.string().trim().min(1, "Enter a contact name.").max(200),
  contactEmail: z
    .string()
    .trim()
    .email("Enter a valid contact email.")
    .max(320),
});

export async function createTenant(input: {
  name: string;
  subdomain: string;
  contactName: string;
  contactEmail: string;
}): Promise<ActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      parsed.error.issues[0]?.message ?? "Check the form and try again.",
    );
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
  if (typeof created.data !== "string")
    return fail("The school was not created.");

  // Generate the Invite Link for the School Admin
  let inviteLink = "";
  try {
    const { data: invitation, error: inviteError } =
      await session.admin.auth.admin.generateLink({
        type: "invite",
        email: parsed.data.contactEmail,
        options: {
          data: { full_name: parsed.data.contactName },

          redirectTo: `https://${parsed.data.subdomain}.terralearn.space/set-password`,
        },
      });

    if (!inviteError && invitation) {
      inviteLink = invitation.properties.action_link;
    } else {
      console.error("Failed to generate invite", inviteError);
    }
  } catch (err) {
    console.error("Error generating link", err);
  }

  revalidatePath("/platform/tenants");

  // Return the ID and the new link
  return { ok: true, id: created.data, inviteLink };
}

export async function updateTenantSubscription(
  tenantId: string,
  status: SubscriptionStatus,
): Promise<ActionResult> {
  const next = STATUS_TO_DB[status];
  if (!next) return fail("Choose a subscription status.");
  if (!z.string().uuid().safeParse(tenantId).success)
    return fail("That school was not found.");

  const session = await requirePlatformAdmin();
  if (isDenied(session)) return session;

  // one database call changes the status and writes the audit row
  // together. If either fails, neither is saved.
  const changed = await session.admin.rpc("set_school_status", {
    p_tenant_id: tenantId,
    p_status: next,
    p_actor_id: session.userId,
  });
  if (changed.error)
    return fail(
      schoolChangeError(
        changed.error.message,
        "The subscription was not updated.",
      ),
    );
  if (changed.data === false) return fail("That status is already set.");

  revalidatePath("/platform/tenants");
  revalidatePath(`/platform/tenants/${tenantId}`);
  revalidatePath(`/platform/tenants/${tenantId}/subscription`);
  return { ok: true };
}

const contactSchema = z.object({
  contactName: z.string().trim().min(1, "Enter a contact name.").max(200),
  contactEmail: z
    .string()
    .trim()
    .email("Enter a valid contact email.")
    .max(320),
});

export async function updateTenantContact(
  tenantId: string,
  input: { contactName: string; contactEmail: string },
): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(tenantId).success)
    return fail("That school was not found.");
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      parsed.error.issues[0]?.message ?? "Check the form and try again.",
    );
  }

  const session = await requirePlatformAdmin();
  if (isDenied(session)) return session;

  const changed = await session.admin.rpc("update_school_contact", {
    p_tenant_id: tenantId,
    p_contact_name: parsed.data.contactName,
    p_contact_email: parsed.data.contactEmail,
    p_actor_id: session.userId,
  });
  if (changed.error)
    return fail(
      schoolChangeError(
        changed.error.message,
        "The contact details were not updated.",
      ),
    );
  if (changed.data === false)
    return fail("Those contact details are already saved.");

  revalidatePath("/platform/tenants");
  revalidatePath(`/platform/tenants/${tenantId}`);
  return { ok: true };
}
