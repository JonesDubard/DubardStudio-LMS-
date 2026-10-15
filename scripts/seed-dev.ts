/**
 * Creates the local pilot tenant and one user per persona.
 * Run: npm run seed:dev
 *
 * Requires 0001_custom_access_token_hook.sql,
 * 0002_academic_structure.sql, 0003_content.sql,
 * 0004_tenant_branding.sql, and 0005a_files.sql to be applied first.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PILOT_TEACHER_EMAIL } from "../lib/teacher/assignment-stub";

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
  await seedContent(admin, tenantId);

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

const COURSE_NAME = "JSS 2A Mathematics \u2014 First Term 2026";
const PUBLISHED_AT = "2026-09-08T08:00:00.000Z";

const CONTENT_LESSONS = [
  {
    title: "Introduction to Fractions",
    status: "published",
    published_at: PUBLISHED_AT,
  },
  {
    title: "Adding and Subtracting Fractions",
    status: "published",
    published_at: PUBLISHED_AT,
  },
  {
    title: "Multiplying Fractions",
    status: "draft",
    published_at: null,
  },
] as const;

const GRADEBOOK_CATEGORIES = [
  { name: "Quizzes", weight: 30.0, display_order: 1 },
  { name: "Assignments", weight: 30.0, display_order: 2 },
  { name: "Exams", weight: 40.0, display_order: 3 },
] as const;

function contentSetupError(error: { message: string }): Error {
  if (/schema cache|does not exist|could not find the table/i.test(error.message)) {
    return new Error(
      `${error.message}. Apply supabase/migrations/0003_content.sql and 0005a_files.sql in the Supabase SQL editor first.`,
    );
  }
  return new Error(error.message);
}

async function seedContent(admin: AdminClient, tenantId: string) {
  // teacher_assignments is not migrated (it arrives with migration 0005b).
  // lib/teacher/assignment-stub.ts assigns PILOT_TEACHER_EMAIL to every course
  // this session can read. Course UUIDs are generated here, so the stub stores
  // the teacher email rather than course ids. Do not create a second teacher
  // in this script. Other teachers in the tenant stay unassigned.
  // Lessons below set created_by to this teacher's profile id (auth user id).
  const { data: teacher, error: teacherError } = await admin
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("email", PILOT_TEACHER_EMAIL)
    .maybeSingle();
  if (teacherError) throw teacherError;
  if (!teacher) {
    throw new Error("Pilot School teacher profile was not found");
  }

  const { data: classRow, error: classError } = await admin
    .from("classes")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", "JSS 2")
    .maybeSingle();
  if (classError) throw classError;
  if (!classRow) {
    throw new Error('Class "JSS 2" was not found. Academic seed must run first.');
  }

  const { data: subjectRow, error: subjectError } = await admin
    .from("subjects")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", "Mathematics")
    .maybeSingle();
  if (subjectError) throw subjectError;
  if (!subjectRow) {
    throw new Error('Subject "Mathematics" was not found. Academic seed must run first.');
  }

  const { data: classSubject, error: classSubjectError } = await admin
    .from("class_subjects")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("class_id", classRow.id)
    .eq("subject_id", subjectRow.id)
    .maybeSingle();
  if (classSubjectError) throw classSubjectError;
  if (!classSubject) {
    throw new Error(
      "JSS 2 Mathematics class_subject was not found. The course links to class JSS 2, not a class named JSS 2A.",
    );
  }

  const { data: term, error: termError } = await admin
    .from("terms")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", "First Term")
    .maybeSingle();
  if (termError) throw termError;
  if (!term) {
    throw new Error('Term "First Term" was not found. Academic seed must run first.');
  }

  const courseLookup = await admin
    .from("courses")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", COURSE_NAME)
    .maybeSingle();
  if (courseLookup.error) throw contentSetupError(courseLookup.error);

  let courseId = courseLookup.data?.id as string | undefined;
  if (courseId) {
    const { error } = await admin
      .from("courses")
      .update({
        class_subject_id: classSubject.id,
        term_id: term.id,
      })
      .eq("id", courseId);
    if (error) throw error;
  } else {
    const created = await admin
      .from("courses")
      .insert({
        tenant_id: tenantId,
        class_subject_id: classSubject.id,
        term_id: term.id,
        name: COURSE_NAME,
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    courseId = created.data.id;
  }

  const lessonIds: Record<string, string> = {};
  for (const lesson of CONTENT_LESSONS) {
    const existing = await admin
      .from("lessons")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("course_id", courseId)
      .eq("title", lesson.title)
      .maybeSingle();
    if (existing.error) throw existing.error;

    if (existing.data?.id) {
      const { error } = await admin
        .from("lessons")
        .update({
          status: lesson.status,
          published_at: lesson.published_at,
          created_by: teacher.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.data.id);
      if (error) throw error;
      lessonIds[lesson.title] = existing.data.id;
      continue;
    }

    const created = await admin
      .from("lessons")
      .insert({
        tenant_id: tenantId,
        course_id: courseId,
        title: lesson.title,
        status: lesson.status,
        published_at: lesson.published_at,
        created_by: teacher.id,
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    lessonIds[lesson.title] = created.data.id;
  }

  const fractionsLessonId = lessonIds["Introduction to Fractions"];
  if (!fractionsLessonId) {
    throw new Error("Introduction to Fractions was not seeded");
  }

  const samplePath = `${tenantId}/lessons/${fractionsLessonId}/sample.pdf`;
  const fileLookup = await admin
    .from("files")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("storage_path", samplePath)
    .maybeSingle();
  if (fileLookup.error) throw contentSetupError(fileLookup.error);

  let fileId = fileLookup.data?.id as string | undefined;
  if (!fileId) {
    const createdFile = await admin
      .from("files")
      .insert({
        tenant_id: tenantId,
        storage_path: samplePath,
        original_name: "sample.pdf",
        mime_type: "application/pdf",
        size_bytes: 100000,
      })
      .select("id")
      .single();
    if (createdFile.error) throw contentSetupError(createdFile.error);
    fileId = createdFile.data.id;
  }

  const pdfLookup = await admin
    .from("lesson_materials")
    .select("id")
    .eq("lesson_id", fractionsLessonId)
    .eq("file_id", fileId)
    .maybeSingle();
  if (pdfLookup.error) throw pdfLookup.error;
  const pdfValues = {
    tenant_id: tenantId,
    lesson_id: fractionsLessonId,
    kind: "pdf",
    file_id: fileId,
    external_url: null,
    file_size: 100000,
    mime_type: "application/pdf",
  };
  if (pdfLookup.data?.id) {
    const { error } = await admin
      .from("lesson_materials")
      .update(pdfValues)
      .eq("id", pdfLookup.data.id);
    if (error) throw error;
  } else {
    const { error } = await admin.from("lesson_materials").insert(pdfValues);
    if (error) throw error;
  }

  const videoLookup = await admin
    .from("lesson_materials")
    .select("id")
    .eq("lesson_id", fractionsLessonId)
    .eq("external_url", "https://www.youtube.com/watch?v=example")
    .maybeSingle();
  if (videoLookup.error) throw videoLookup.error;
  const videoValues = {
    tenant_id: tenantId,
    lesson_id: fractionsLessonId,
    kind: "external_video",
    file_id: null,
    external_url: "https://www.youtube.com/watch?v=example",
    file_size: null,
    mime_type: null,
  };
  if (videoLookup.data?.id) {
    const { error } = await admin
      .from("lesson_materials")
      .update(videoValues)
      .eq("id", videoLookup.data.id);
    if (error) throw error;
  } else {
    const { error } = await admin.from("lesson_materials").insert(videoValues);
    if (error) throw error;
  }

  for (const category of GRADEBOOK_CATEGORIES) {
    const existing = await admin
      .from("gradebook_categories")
      .select("id")
      .eq("course_id", courseId)
      .eq("name", category.name)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data?.id) {
      const { error } = await admin
        .from("gradebook_categories")
        .update({
          tenant_id: tenantId,
          weight: category.weight,
          display_order: category.display_order,
        })
        .eq("id", existing.data.id);
      if (error) throw error;
      continue;
    }
    const { error } = await admin.from("gradebook_categories").insert({
      tenant_id: tenantId,
      course_id: courseId,
      name: category.name,
      weight: category.weight,
      display_order: category.display_order,
    });
    if (error) throw error;
  }

  console.log("Content seeded");
  console.log(
    `  assignment stub: ${PILOT_TEACHER_EMAIL} is assigned to every course in this tenant until migration 0005b. Other teachers are assigned to none.`,
  );
  console.log(`  course: ${COURSE_NAME}`);
  console.log(
    "  lessons: Introduction to Fractions (published), Adding and Subtracting Fractions (published), Multiplying Fractions (draft)",
  );
  console.log("  materials: pdf + external video on Introduction to Fractions");
  console.log("  gradebook: Quizzes 30, Assignments 30, Exams 40");
  console.log("");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
