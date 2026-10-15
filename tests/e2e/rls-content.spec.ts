import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "../../scripts/load-env";

loadLocalEnv();

const TENANT_A = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1";
const TENANT_B = "ffffffff-ffff-4fff-8fff-fffffffffff1";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} in .env.local`);
  }
  return value;
}

function decodeJwt(accessToken: string): Record<string, unknown> {
  const segment = accessToken.split(".")[1];
  if (!segment) {
    throw new Error("Access token has no payload");
  }
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
}

async function deleteTenantRows(admin: SupabaseClient, table: string, tenantId: string) {
  const { error } = await admin.from(table).delete().eq("tenant_id", tenantId);
  if (!error) return;
  const message = error.message.toLowerCase();
  if (
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    error.code === "PGRST205"
  ) {
    return;
  }
  throw error;
}

type MaterialRow = {
  id: string;
  tenant_id: string;
  lesson_id: string;
  kind: string;
};

function missingTable(message: string): boolean {
  return /schema cache|does not exist|could not find the table/i.test(message);
}

async function insertLessonMaterials(
  admin: SupabaseClient,
  rows: { tenant_id: string; lesson_id: string }[],
): Promise<{ data: MaterialRow[] | null; error: { message: string } | null }> {
  const inserted: MaterialRow[] = [];

  for (const row of rows) {
    const storagePath = `${row.tenant_id}/lessons/${row.lesson_id}/sample.pdf`;
    const fileInsert = await admin
      .from("files")
      .insert({
        tenant_id: row.tenant_id,
        storage_path: storagePath,
        original_name: "sample.pdf",
        mime_type: "application/pdf",
        size_bytes: 100000,
      })
      .select("id")
      .single();

    const filesMissing = fileInsert.error !== null && missingTable(fileInsert.error.message);

    if (filesMissing) {
      const legacy = await admin
        .from("lesson_materials")
        .insert({
          tenant_id: row.tenant_id,
          lesson_id: row.lesson_id,
          kind: "pdf",
          storage_path: storagePath,
          external_url: null,
          file_size: 100000,
          mime_type: "application/pdf",
        })
        .select("id, tenant_id, lesson_id, kind")
        .single();
      if (legacy.error || !legacy.data) {
        return {
          data: null,
          error: legacy.error ?? { message: "legacy material insert failed" },
        };
      }
      inserted.push(legacy.data);
      continue;
    }

    if (fileInsert.error || !fileInsert.data) {
      return {
        data: null,
        error: fileInsert.error ?? { message: "file insert failed" },
      };
    }

    const material = await admin
      .from("lesson_materials")
      .insert({
        tenant_id: row.tenant_id,
        lesson_id: row.lesson_id,
        kind: "pdf",
        file_id: fileInsert.data.id,
        external_url: null,
        file_size: 100000,
        mime_type: "application/pdf",
      })
      .select("id, tenant_id, lesson_id, kind")
      .single();
    if (material.error || !material.data) {
      return {
        data: null,
        error: material.error ?? { message: "material insert failed" },
      };
    }
    inserted.push(material.data);
  }

  return { data: inserted, error: null };
}

async function removeTenant(admin: SupabaseClient, tenantId: string) {
  const tables = [
    "lesson_materials",
    "files",
    "lessons",
    "gradebook_categories",
    "courses",
    "class_subjects",
    "terms",
    "classes",
    "subjects",
    "academic_years",
    "profiles",
  ];
  for (const table of tables) {
    await deleteTenantRows(admin, table, tenantId);
  }
  const { error } = await admin.from("tenants").delete().eq("id", tenantId);
  if (error) throw error;
}

test("lessons and lesson_materials RLS return only the signed-in tenant", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const emailA = `rls-content-a-${Date.now()}@pilotschool.test`;
  const emailB = `rls-content-b-${Date.now()}@pilotschool.test`;
  const password = "Spike-Password-1";

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userIdA: string | undefined;
  let userIdB: string | undefined;

  try {
    await removeTenant(admin, TENANT_A);
    await removeTenant(admin, TENANT_B);

    const { data: listed, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listError) throw listError;
    for (const user of listed.users) {
      if (user.email?.startsWith("rls-content-")) {
        await admin.auth.admin.deleteUser(user.id);
      }
    }

    const { error: tenantError } = await admin.from("tenants").insert([
      { id: TENANT_A, name: "RLS Content A", subdomain: "rls-content-a" },
      { id: TENANT_B, name: "RLS Content B", subdomain: "rls-content-b" },
    ]);
    if (tenantError) throw tenantError;

    const { data: createdA, error: createErrorA } = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
    });
    if (createErrorA || !createdA.user) {
      throw createErrorA ?? new Error("Admin API did not return tenant A user");
    }
    userIdA = createdA.user.id;

    const { data: createdB, error: createErrorB } = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
    });
    if (createErrorB || !createdB.user) {
      throw createErrorB ?? new Error("Admin API did not return tenant B user");
    }
    userIdB = createdB.user.id;

    const { error: profileError } = await admin.from("profiles").insert([
      {
        id: userIdA,
        tenant_id: TENANT_A,
        role: "teacher",
        full_name: "RLS Content Teacher A",
        email: emailA,
      },
      {
        id: userIdB,
        tenant_id: TENANT_B,
        role: "teacher",
        full_name: "RLS Content Teacher B",
        email: emailB,
      },
    ]);
    if (profileError) throw profileError;

    const { data: years, error: yearError } = await admin
      .from("academic_years")
      .insert([
        {
          tenant_id: TENANT_A,
          name: "Tenant A Year",
          start_date: "2026-09-01",
          end_date: "2027-06-30",
          is_current: true,
        },
        {
          tenant_id: TENANT_B,
          name: "Tenant B Year",
          start_date: "2026-09-01",
          end_date: "2027-06-30",
          is_current: true,
        },
      ])
      .select("id, tenant_id");
    if (yearError) throw yearError;
    const yearA = years?.find((row) => row.tenant_id === TENANT_A);
    const yearB = years?.find((row) => row.tenant_id === TENANT_B);
    if (!yearA || !yearB) {
      throw new Error("Service role insert did not return both academic years");
    }

    const { data: terms, error: termError } = await admin
      .from("terms")
      .insert([
        {
          tenant_id: TENANT_A,
          academic_year_id: yearA.id,
          name: "First Term",
          start_date: "2026-09-01",
          end_date: "2026-12-18",
          is_current: true,
        },
        {
          tenant_id: TENANT_B,
          academic_year_id: yearB.id,
          name: "First Term",
          start_date: "2026-09-01",
          end_date: "2026-12-18",
          is_current: true,
        },
      ])
      .select("id, tenant_id");
    if (termError) throw termError;
    const termA = terms?.find((row) => row.tenant_id === TENANT_A);
    const termB = terms?.find((row) => row.tenant_id === TENANT_B);
    if (!termA || !termB) {
      throw new Error("Service role insert did not return both terms");
    }

    const { data: classes, error: classError } = await admin
      .from("classes")
      .insert([
        { tenant_id: TENANT_A, name: "JSS 2", grade_level: "JSS 2" },
        { tenant_id: TENANT_B, name: "JSS 2", grade_level: "JSS 2" },
      ])
      .select("id, tenant_id");
    if (classError) throw classError;
    const classA = classes?.find((row) => row.tenant_id === TENANT_A);
    const classB = classes?.find((row) => row.tenant_id === TENANT_B);
    if (!classA || !classB) {
      throw new Error("Service role insert did not return both classes");
    }

    const { data: subjects, error: subjectError } = await admin
      .from("subjects")
      .insert([
        { tenant_id: TENANT_A, name: "Mathematics" },
        { tenant_id: TENANT_B, name: "Mathematics" },
      ])
      .select("id, tenant_id");
    if (subjectError) throw subjectError;
    const subjectA = subjects?.find((row) => row.tenant_id === TENANT_A);
    const subjectB = subjects?.find((row) => row.tenant_id === TENANT_B);
    if (!subjectA || !subjectB) {
      throw new Error("Service role insert did not return both subjects");
    }

    const { data: classSubjects, error: classSubjectError } = await admin
      .from("class_subjects")
      .insert([
        {
          tenant_id: TENANT_A,
          class_id: classA.id,
          subject_id: subjectA.id,
        },
        {
          tenant_id: TENANT_B,
          class_id: classB.id,
          subject_id: subjectB.id,
        },
      ])
      .select("id, tenant_id");
    if (classSubjectError) throw classSubjectError;
    const classSubjectA = classSubjects?.find((row) => row.tenant_id === TENANT_A);
    const classSubjectB = classSubjects?.find((row) => row.tenant_id === TENANT_B);
    if (!classSubjectA || !classSubjectB) {
      throw new Error("Service role insert did not return both class subjects");
    }

    const { data: courses, error: courseError } = await admin
      .from("courses")
      .insert([
        {
          tenant_id: TENANT_A,
          class_subject_id: classSubjectA.id,
          term_id: termA.id,
          name: "Tenant A Course",
        },
        {
          tenant_id: TENANT_B,
          class_subject_id: classSubjectB.id,
          term_id: termB.id,
          name: "Tenant B Course",
        },
      ])
      .select("id, tenant_id");
    if (courseError) throw courseError;
    const courseA = courses?.find((row) => row.tenant_id === TENANT_A);
    const courseB = courses?.find((row) => row.tenant_id === TENANT_B);
    if (!courseA || !courseB) {
      throw new Error("Service role insert did not return both courses");
    }

    const { data: lessons, error: lessonError } = await admin
      .from("lessons")
      .insert([
        {
          tenant_id: TENANT_A,
          course_id: courseA.id,
          title: "Tenant A Lesson",
          status: "published",
          published_at: "2026-09-08T08:00:00.000Z",
          created_by: userIdA,
        },
        {
          tenant_id: TENANT_B,
          course_id: courseB.id,
          title: "Tenant B Lesson",
          status: "draft",
          published_at: null,
          created_by: userIdB,
        },
      ])
      .select("id, tenant_id, title");
    if (lessonError) throw lessonError;
    const lessonA = lessons?.find((row) => row.tenant_id === TENANT_A);
    const lessonB = lessons?.find((row) => row.tenant_id === TENANT_B);
    if (!lessonA || !lessonB) {
      throw new Error("Service role insert did not return both lessons");
    }

    const { data: materials, error: materialError } = await insertLessonMaterials(admin, [
      {
        tenant_id: TENANT_A,
        lesson_id: lessonA.id,
      },
      {
        tenant_id: TENANT_B,
        lesson_id: lessonB.id,
      },
    ]);
    if (materialError) throw materialError;
    const materialA = materials?.find((row) => row.tenant_id === TENANT_A);
    const materialB = materials?.find((row) => row.tenant_id === TENANT_B);
    if (!materialA || !materialB) {
      throw new Error("Service role insert did not return both lesson materials");
    }

    await page.goto("/login");
    await page.getByLabel("Email").fill(emailA);
    await page.getByLabel("Password").fill(password);
    const tokenResponse = page.waitForResponse((response) => {
      return (
        response.url().includes("/auth/v1/token") && response.request().method() === "POST"
      );
    });
    await page.getByRole("button", { name: "Sign in" }).click();
    const response = await tokenResponse;
    const body = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      error_description?: string;
      msg?: string;
      error?: string;
    };
    expect(
      response.ok(),
      body.error_description ?? body.msg ?? body.error ?? "login failed",
    ).toBeTruthy();
    if (!body.access_token || !body.refresh_token) {
      throw new Error("Token response did not include an access token");
    }

    const claims = decodeJwt(body.access_token);
    const userClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: sessionError } = await userClient.auth.setSession({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    });
    if (sessionError) throw sessionError;

    const listedLessons = await userClient.from("lessons").select("id, tenant_id, title");
    const blockedLesson = await userClient
      .from("lessons")
      .select("id, tenant_id, title")
      .eq("id", lessonB.id);
    const listedMaterials = await userClient
      .from("lesson_materials")
      .select("id, tenant_id, lesson_id, kind, lessons(id, tenant_id)");
    const blockedMaterial = await userClient
      .from("lesson_materials")
      .select("id, tenant_id, lesson_id, kind, lessons(id, tenant_id)")
      .eq("id", materialB.id);

    const debug = JSON.stringify(
      {
        jwt: {
          app_role: claims.app_role ?? null,
          tenant_id: claims.tenant_id ?? null,
          role: claims.role ?? null,
        },
        policy: "tenant_id = (auth.jwt() ->> 'tenant_id')::uuid",
        listLessons: "select id, tenant_id, title from lessons",
        listLessonsError: listedLessons.error,
        byIdLesson: `select id, tenant_id, title from lessons where id = '${lessonB.id}'`,
        byIdLessonError: blockedLesson.error,
        listMaterials:
          "select id, tenant_id, lesson_id, kind, lessons(id, tenant_id) from lesson_materials",
        listMaterialsError: listedMaterials.error,
        byIdMaterial: `select lesson_materials joined to lessons where id = '${materialB.id}'`,
        byIdMaterialError: blockedMaterial.error,
      },
      null,
      2,
    );

    expect(claims.app_role, debug).toBe("teacher");
    expect(claims.tenant_id, debug).toBe(TENANT_A);
    expect(listedLessons.error, debug).toBeNull();
    expect(listedLessons.data, debug).toEqual([
      {
        id: lessonA.id,
        tenant_id: TENANT_A,
        title: "Tenant A Lesson",
      },
    ]);
    expect(blockedLesson.error, debug).toBeNull();
    expect(blockedLesson.data, debug).toEqual([]);
    expect(listedMaterials.error, debug).toBeNull();
    expect(listedMaterials.data, debug).toEqual([
      {
        id: materialA.id,
        tenant_id: TENANT_A,
        lesson_id: lessonA.id,
        kind: "pdf",
        lessons: {
          id: lessonA.id,
          tenant_id: TENANT_A,
        },
      },
    ]);
    expect(blockedMaterial.error, debug).toBeNull();
    expect(blockedMaterial.data, debug).toEqual([]);
  } finally {
    await removeTenant(admin, TENANT_A);
    await removeTenant(admin, TENANT_B);
    if (userIdA) {
      await admin.auth.admin.deleteUser(userIdA);
    }
    if (userIdB) {
      await admin.auth.admin.deleteUser(userIdB);
    }
  }
});
