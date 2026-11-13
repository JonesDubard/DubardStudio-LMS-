"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

type ActionResult = { ok: true } | { ok: false; error: string };
type AdminSession = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  tenantId: string;
};

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function revalidatePeople() {
  revalidatePath("/admin/people/teachers");
  revalidatePath("/admin/people/students");
  revalidatePath("/admin/people/admins");
  revalidatePath("/admin/people/parents");
  revalidatePath("/teacher/home");
  revalidatePath("/teacher/grading");
  revalidatePath("/classes");
}

async function requireSchoolAdmin(): Promise<AdminSession | ActionResult> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return fail("You need to sign in again.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) return fail("You need to sign in again.");

  const claims = readAccessTokenClaims(accessToken);
  if (!claims.tenantId || !claims.app_roles.includes("school_admin")) {
    return fail("Only a school admin can do that.");
  }
  return { supabase, tenantId: claims.tenantId };
}

function isDenied(value: AdminSession | ActionResult): value is ActionResult {
  return "ok" in value;
}

function ids(personId: string, optionId: string): { personId: string; optionId: string } | ActionResult {
  const person = idSchema.safeParse(personId);
  const option = idSchema.safeParse(optionId);
  if (!person.success || !option.success) return fail("That record was not found.");
  return { personId: person.data, optionId: option.data };
}

export async function assignStudentClass(
  studentId: string,
  classId: string,
): Promise<ActionResult> {
  const parsed = ids(studentId, classId);
  if ("ok" in parsed) return parsed;

  const session = await requireSchoolAdmin();
  if (isDenied(session)) return session;
  const { supabase, tenantId } = session;

  const year = await supabase
    .from("academic_years")
    .select("id")
    .eq("is_current", true)
    .maybeSingle<{ id: string }>();
  if (year.error) return fail(year.error.message);
  if (!year.data) {
    return fail("Set a current academic year under Academic before assigning a class.");
  }

  const student = await supabase
    .from("memberships")
    .select("id")
    .eq("profile_id", parsed.personId)
    .eq("role", "student")
    .neq("status", "removed")
    .maybeSingle<{ id: string }>();
  if (student.error) return fail(student.error.message);
  if (!student.data) return fail("That student was not found.");

  const schoolClass = await supabase
    .from("classes")
    .select("id")
    .eq("id", parsed.optionId)
    .maybeSingle<{ id: string }>();
  if (schoolClass.error) return fail(schoolClass.error.message);
  if (!schoolClass.data) return fail("That class was not found.");

  const existing = await supabase
    .from("enrollments")
    .select("id, class_id, status")
    .eq("student_id", parsed.personId)
    .eq("academic_year_id", year.data.id)
    .returns<{ id: string; class_id: string; status: string }[]>();
  if (existing.error) return fail(existing.error.message);
  const rows = existing.data ?? [];

  for (const row of rows) {
    if (row.class_id === parsed.optionId || row.status !== "active") continue;
    const withdrawn = await supabase
      .from("enrollments")
      .update({ status: "withdrawn", ended_at: new Date().toISOString() })
      .eq("id", row.id)
      .select("id");
    if (withdrawn.error) return fail(withdrawn.error.message);
  }

  const current = rows.find((row) => row.class_id === parsed.optionId);
  if (current) {
    const restored = await supabase
      .from("enrollments")
      .update({ status: "active", ended_at: null })
      .eq("id", current.id)
      .select("id");
    if (restored.error) return fail(restored.error.message);
    if (!restored.data || restored.data.length === 0) {
      return fail("The class was not assigned.");
    }
    revalidatePeople();
    return { ok: true };
  }

  const inserted = await supabase
    .from("enrollments")
    .insert({
      tenant_id: tenantId,
      student_id: parsed.personId,
      class_id: parsed.optionId,
      academic_year_id: year.data.id,
      status: "active",
    })
    .select("id");
  if (inserted.error) {
    if (inserted.error.message.toLowerCase().includes("not a student")) {
      return fail("That person is not a student in this school.");
    }
    return fail(inserted.error.message);
  }
  if (!inserted.data || inserted.data.length === 0) return fail("The class was not assigned.");

  revalidatePeople();
  return { ok: true };
}

export async function assignTeacherClass(
  teacherId: string,
  classSubjectId: string,
): Promise<ActionResult> {
  const parsed = ids(teacherId, classSubjectId);
  if ("ok" in parsed) return parsed;

  const session = await requireSchoolAdmin();
  if (isDenied(session)) return session;
  const { supabase, tenantId } = session;

  const teacher = await supabase
    .from("memberships")
    .select("id")
    .eq("profile_id", parsed.personId)
    .eq("role", "teacher")
    .neq("status", "removed")
    .maybeSingle<{ id: string }>();
  if (teacher.error) return fail(teacher.error.message);
  if (!teacher.data) return fail("That teacher was not found.");

  const link = await supabase
    .from("class_subjects")
    .select("id")
    .eq("id", parsed.optionId)
    .maybeSingle<{ id: string }>();
  if (link.error) return fail(link.error.message);
  if (!link.data) return fail("That class and subject were not found.");

  const inserted = await supabase
    .from("teacher_assignments")
    .insert({
      tenant_id: tenantId,
      teacher_id: parsed.personId,
      class_subject_id: parsed.optionId,
      role: "lead",
    })
    .select("id");
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      return fail("This teacher is already assigned to that class and subject.");
    }
    if (inserted.error.message.toLowerCase().includes("not a teacher")) {
      return fail("That person is not a teacher in this school.");
    }
    return fail(inserted.error.message);
  }
  if (!inserted.data || inserted.data.length === 0) {
    return fail("The class was not assigned.");
  }

  revalidatePeople();
  return { ok: true };
}

export async function removeSchoolAdmin(profileId: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(profileId);
  if (!parsed.success) return fail("That admin was not found.");

  const session = await requireSchoolAdmin();
  if (isDenied(session)) return session;

  const updated = await session.supabase
    .from("memberships")
    .update({ status: "removed" })
    .eq("profile_id", parsed.data)
    .eq("role", "school_admin")
    .neq("status", "removed")
    .select("id");
  if (updated.error) {
    if (updated.error.message.toLowerCase().includes("last active school_admin")) {
      return fail("This school needs at least one active school admin.");
    }
    return fail(updated.error.message);
  }
  if (!updated.data || updated.data.length === 0) return fail("That admin was not found.");

  revalidatePeople();
  return { ok: true };
}

export async function linkParentChild(
  parentId: string,
  studentId: string,
): Promise<ActionResult> {
  const parsed = ids(parentId, studentId);
  if ("ok" in parsed) return parsed;

  const session = await requireSchoolAdmin();
  if (isDenied(session)) return session;
  const { supabase, tenantId } = session;

  const parent = await supabase
    .from("memberships")
    .select("id")
    .eq("profile_id", parsed.personId)
    .eq("role", "parent")
    .neq("status", "removed")
    .maybeSingle<{ id: string }>();
  if (parent.error) return fail(parent.error.message);
  if (!parent.data) return fail("That parent was not found.");

  const student = await supabase
    .from("memberships")
    .select("id")
    .eq("profile_id", parsed.optionId)
    .eq("role", "student")
    .neq("status", "removed")
    .maybeSingle<{ id: string }>();
  if (student.error) return fail(student.error.message);
  if (!student.data) return fail("That student was not found.");

  const inserted = await supabase
    .from("parent_children")
    .insert({
      tenant_id: tenantId,
      parent_id: parsed.personId,
      student_id: parsed.optionId,
    })
    .select("id");
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      return fail("That child is already linked to this parent.");
    }
    return fail(inserted.error.message);
  }
  if (!inserted.data || inserted.data.length === 0) return fail("The child was not linked.");

  revalidatePeople();
  return { ok: true };
}
