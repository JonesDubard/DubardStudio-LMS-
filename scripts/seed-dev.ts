/**
 * Creates the local pilot tenant and one user per persona.
 * Run: npm run seed:dev
 *
 * Requires 0001_custom_access_token_hook.sql and
 * 0002_academic_structure.sql to be applied first.
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

  if (!tenantId) {
    throw new Error("Pilot tenant was not created");
  }

  await seedAcademicStructure(admin, tenantId);

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

const YEAR_NAME = "2026–2027";
const TERM_ROWS = [
  {
    name: "First Term",
    start_date: "2026-09-01",
    end_date: "2026-12-18",
    is_current: true,
  },
  {
    name: "Second Term",
    start_date: "2027-01-04",
    end_date: "2027-04-02",
    is_current: false,
  },
  {
    name: "Third Term",
    start_date: "2027-04-19",
    end_date: "2027-06-30",
    is_current: false,
  },
] as const;
const CLASS_NAMES = ["JSS 1", "JSS 2", "JSS 3", "SSS 1"] as const;
const SUBJECT_NAMES = [
  "Mathematics",
  "English",
  "Science",
  "Social Studies",
  "Computer Studies",
] as const;
const LINKED_SUBJECTS = ["Mathematics", "English", "Science"] as const;

async function ensureByName(
  admin: AdminClient,
  table: "academic_years" | "terms" | "classes" | "subjects",
  match: Record<string, string>,
  values: Record<string, unknown>,
): Promise<string> {
  let query = admin.from(table).select("id");
  for (const [column, value] of Object.entries(match)) {
    query = query.eq(column, value);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(
      `${error.message}. Apply supabase/migrations/0002_academic_structure.sql in the Supabase SQL editor first.`,
    );
  }
  if (data?.id) {
    const { error: updateError } = await admin.from(table).update(values).eq("id", data.id);
    if (updateError) throw updateError;
    return data.id;
  }
  const created = await admin
    .from(table)
    .insert({ ...match, ...values })
    .select("id")
    .single();
  if (created.error) throw created.error;
  return created.data.id;
}

async function seedAcademicStructure(admin: AdminClient, tenantId: string) {
  const yearId = await ensureByName(
    admin,
    "academic_years",
    { tenant_id: tenantId, name: YEAR_NAME },
    {
      start_date: "2026-09-01",
      end_date: "2027-06-30",
      is_current: true,
    },
  );

  for (const term of TERM_ROWS) {
    await ensureByName(
      admin,
      "terms",
      { tenant_id: tenantId, name: term.name },
      {
        academic_year_id: yearId,
        start_date: term.start_date,
        end_date: term.end_date,
        is_current: term.is_current,
      },
    );
  }

  const classIds: Record<string, string> = {};
  for (const name of CLASS_NAMES) {
    classIds[name] = await ensureByName(
      admin,
      "classes",
      { tenant_id: tenantId, name },
      { grade_level: name },
    );
  }

  const subjectIds: Record<string, string> = {};
  for (const name of SUBJECT_NAMES) {
    subjectIds[name] = await ensureByName(
      admin,
      "subjects",
      { tenant_id: tenantId, name },
      {},
    );
  }

  for (const className of CLASS_NAMES) {
    for (const subjectName of LINKED_SUBJECTS) {
      const classId = classIds[className];
      const subjectId = subjectIds[subjectName];
      const { data: existing, error: lookupError } = await admin
        .from("class_subjects")
        .select("id")
        .eq("class_id", classId)
        .eq("subject_id", subjectId)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) continue;
      const { error } = await admin.from("class_subjects").insert({
        tenant_id: tenantId,
        class_id: classId,
        subject_id: subjectId,
      });
      if (error) throw error;
    }
  }

  console.log("Academic structure seeded");
  console.log(`  year: ${YEAR_NAME} (2026-09-01 → 2027-06-30, current)`);
  console.log(`  terms: ${TERM_ROWS.map((term) => term.name).join(", ")}`);
  console.log(`  classes: ${CLASS_NAMES.join(", ")}`);
  console.log(`  subjects: ${SUBJECT_NAMES.join(", ")}`);
  console.log(`  class_subjects: ${LINKED_SUBJECTS.join(", ")} on every class`);
  console.log("");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
