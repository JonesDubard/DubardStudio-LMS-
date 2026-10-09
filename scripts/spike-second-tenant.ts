/**
 * Manual cross-tenant fixture. Must not be used as production seed.
 * Creates tenant "Other Tenant School" (subdomain other-tenant), a school
 * admin user, and one academic year named "Other Tenant Year" on that
 * tenant only. Kept in the DB as a permanent cross-tenant testing fixture.
 * Uses the service role. Does not print secrets. Re-running is safe.
 *
 * Run: npx tsx scripts/spike-second-tenant.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./load-env";

loadLocalEnv();

const TENANT_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1";
const TENANT_NAME = "Other Tenant School";
const SUBDOMAIN = "other-tenant";
const YEAR_NAME = "Other Tenant Year";
const EMAIL = "other-tenant-admin@example.test";
const PASSWORD = "Other-Tenant-Spike-1";

type AuthUser = { id: string; email?: string };

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Fill .env.local before running this spike.`,
    );
  }
  return value;
}

async function findUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<AuthUser | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const found = data.users.find(
      (user: AuthUser) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(
  admin: SupabaseClient,
  email: string,
): Promise<AuthUser> {
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

  const { data: updated, error: updateError } =
    await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
    });
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
    .eq("id", TENANT_ID)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (!existingTenant) {
    const { error } = await admin.from("tenants").insert({
      id: TENANT_ID,
      name: TENANT_NAME,
      subdomain: SUBDOMAIN,
    });
    if (error) throw error;
  }

  const user = await ensureUser(admin, EMAIL);
  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    tenant_id: TENANT_ID,
    role: "school_admin",
    full_name: "Other Tenant Admin",
    email: EMAIL,
  });
  if (profileError) throw profileError;

  const { data: existingYear, error: yearLookupError } = await admin
    .from("academic_years")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .eq("name", YEAR_NAME)
    .maybeSingle();
  if (yearLookupError) throw yearLookupError;

  if (!existingYear) {
    const { error } = await admin.from("academic_years").insert({
      tenant_id: TENANT_ID,
      name: YEAR_NAME,
      start_date: "2030-01-01",
      end_date: "2030-12-31",
      is_current: true,
    });
    if (error) throw error;
  }

  console.log("Second tenant left in place for a repeatable isolation check.");
  console.log(`tenant: ${TENANT_NAME}`);
  console.log(`tenant_id: ${TENANT_ID}`);
  console.log(`subdomain: ${SUBDOMAIN}`);
  console.log(`academic year: ${YEAR_NAME}`);
  console.log("This year is not inserted into the pilot tenant.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Spike failed";
  console.error(message);
  process.exit(1);
});
