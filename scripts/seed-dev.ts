/**
 * Creates the local pilot tenant and one user per persona.
 * Run: npm run seed:dev
 *
 * Requires 0001_custom_access_token_hook.sql to be applied first.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AuthUser = { id: string; email?: string };
import { loadLocalEnv } from "./load-env";

loadLocalEnv();

const PASSWORD = "Pilot-School-1";

const TENANT_USERS = [
  {
    email: "school-admin@pilotschool.test",
    role: "school_admin",
    fullName: "School Admin",
  },
  {
    email: "teacher@pilotschool.test",
    role: "teacher",
    fullName: "Teacher",
  },
  {
    email: "student@pilotschool.test",
    role: "student",
    fullName: "Student",
  },
  {
    email: "parent@pilotschool.test",
    role: "parent",
    fullName: "Parent",
  },
] as const;

type AdminClient = SupabaseClient;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}

async function findUserByEmail(admin: AdminClient, email: string): Promise<AuthUser | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find(
      (user: AuthUser) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(admin: AdminClient, email: string): Promise<AuthUser> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });

  if (!error && data.user) return data.user;

  const existing = await findUserByEmail(admin, email);
  if (!existing) {
    throw error ?? new Error(`Could not create ${email}`);
  }

  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(
    existing.id,
    { password: PASSWORD, email_confirm: true },
  );
  if (updateError) throw updateError;
  return updated.user ?? existing;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existingTenant, error: lookupError } = await admin
    .from("tenants")
    .select("id")
    .eq("subdomain", "pilotschool")
    .maybeSingle();

  if (lookupError) {
    const detail = lookupError.message;
    if (/fetch failed|ENOTFOUND|network/i.test(detail)) {
      throw new Error(
        `${detail}. NEXT_PUBLIC_SUPABASE_URL did not resolve. Copy the project URL from the Supabase dashboard Connect dialog into .env.local.`,
      );
    }
    throw new Error(
      `${detail}. Apply supabase/migrations/0001_custom_access_token_hook.sql in the Supabase SQL editor first.`,
    );
  }

  let tenantId = existingTenant?.id as string | undefined;
  if (!tenantId) {
    const { data, error } = await admin
      .from("tenants")
      .insert({ name: "Pilot School #1", subdomain: "pilotschool" })
      .select("id")
      .single();
    if (error) throw error;
    tenantId = data.id;
  } else {
    const { error } = await admin
      .from("tenants")
      .update({ name: "Pilot School #1" })
      .eq("id", tenantId);
    if (error) throw error;
  }

  const platformUser = await ensureUser(admin, "platform-admin@pilotschool.test");
  const { error: dropProfileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", platformUser.id);
  if (dropProfileError) throw dropProfileError;

  const { error: platformError } = await admin.from("platform_admins").upsert({
    id: platformUser.id,
    full_name: "Platform Admin",
  });
  if (platformError) throw platformError;

  for (const person of TENANT_USERS) {
    const user = await ensureUser(admin, person.email);
    const { error: dropAdminError } = await admin
      .from("platform_admins")
      .delete()
      .eq("id", user.id);
    if (dropAdminError) throw dropAdminError;

    const { error: profileError } = await admin.from("profiles").upsert({
      id: user.id,
      tenant_id: tenantId,
      role: person.role,
      full_name: person.fullName,
      email: person.email,
    });
    if (profileError) throw profileError;
  }

  console.log("Dev seed ready");
  console.log("");
  console.log("Tenant: Pilot School #1");
  console.log(`tenant_id: ${tenantId}`);
  console.log("subdomain: pilotschool");
  console.log("");
  console.log("Email                              Role             Password");
  console.log(`platform-admin@pilotschool.test    platform_admin   ${PASSWORD}`);
  for (const person of TENANT_USERS) {
    console.log(
      `${person.email.padEnd(35)}${person.role.padEnd(17)}${PASSWORD}`,
    );
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
