"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import {
  academicYearSchema,
  classSchema,
  classSubjectSchema,
  firstZodMessage,
  subjectSchema,
  termOutsideYearMessage,
  termSchema,
  type AcademicYearInput,
  type ActionResult,
  type ClassInput,
  type ClassSubjectInput,
  type SubjectInput,
  type TermInput,
} from "@/lib/academic/schema";
import { createClient } from "@/lib/supabase/server";

const ACADEMIC_PATHS = [
  "/admin/academic",
  "/admin/academic/years",
  "/admin/academic/terms",
  "/admin/academic/classes",
  "/admin/academic/subjects",
] as const;

const idSchema = z.string().uuid();

type DbError = { message: string; code?: string };

function revalidateAcademic() {
  for (const path of ACADEMIC_PATHS) {
    revalidatePath(path);
  }
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function dbMessage(error: DbError, foreignKeyMessage: string): string {
  if (error.code === "23505") {
    return "This subject is already linked to that class.";
  }
  if (error.code === "23503") {
    return foreignKeyMessage;
  }
  if (error.message.toLowerCase().includes("row-level security")) {
    return "You do not have access to that record.";
  }
  return error.message;
}

function wroteRows(
  data: { id: string }[] | null,
  error: DbError | null,
  emptyMessage: string,
  foreignKeyMessage: string,
): { ok: false; error: string } | null {
  if (error) return fail(dbMessage(error, foreignKeyMessage));
  if (!data || data.length === 0) return fail(emptyMessage);
  return null;
}

/**
 * Inserts must include tenant_id. Migration 0002 policies are FOR ALL with
 * USING only, and Postgres applies that expression as WITH CHECK. The value
 * comes from the access-token claim, the same read as middleware.
 */
async function requireTenantId(
  supabase: SupabaseClient,
): Promise<{ tenantId: string } | { ok: false; error: string }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return fail("You need to sign in again.");
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) {
    return fail("You need to sign in again.");
  }

  const { tenantId } = readAccessTokenClaims(accessToken);
  if (!tenantId) return fail("This session has no school.");
  return { tenantId };
}

async function requireUser(
  supabase: SupabaseClient,
): Promise<{ ok: false; error: string } | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return fail("You need to sign in again.");
  return null;
}

function isTenantFailure(
  value: { tenantId: string } | { ok: false; error: string },
): value is { ok: false; error: string } {
  return "ok" in value;
}

async function clearCurrent(
  supabase: SupabaseClient,
  table: "academic_years" | "terms",
): Promise<{ ok: false; error: string } | null> {
  const { error } = await supabase
    .from(table)
    .update({ is_current: false })
    .eq("is_current", true);
  if (error) return fail(error.message);
  return null;
}

async function nameTaken(
  supabase: SupabaseClient,
  table: "academic_years" | "classes" | "subjects",
  name: string,
  message: string,
  exceptId?: string,
): Promise<{ ok: false; error: string } | null> {
  let query = supabase.from(table).select("id").eq("name", name);
  if (exceptId) query = query.neq("id", exceptId);
  const { data, error } = await query.limit(1).returns<{ id: string }[]>();
  if (error) return fail(error.message);
  if (data && data.length > 0) return fail(message);
  return null;
}

function parseId(
  id: string,
  message: string,
): { ok: false; error: string } | null {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return fail(message);
  return null;
}

export async function createAcademicYear(
  input: AcademicYearInput,
): Promise<ActionResult> {
  const parsed = academicYearSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const supabase = await createClient();
  const tenant = await requireTenantId(supabase);
  if (isTenantFailure(tenant)) return tenant;

  const duplicate = await nameTaken(
    supabase,
    "academic_years",
    parsed.data.name,
    "A year with this name already exists.",
  );
  if (duplicate) return duplicate;

  if (parsed.data.is_current) {
    const cleared = await clearCurrent(supabase, "academic_years");
    if (cleared) return cleared;
  }

  const { data, error } = await supabase
    .from("academic_years")
    .insert({
      tenant_id: tenant.tenantId,
      name: parsed.data.name,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      is_current: parsed.data.is_current,
    })
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "The academic year was not created.",
    "The academic year was not created.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

export async function updateAcademicYear(
  id: string,
  input: AcademicYearInput,
): Promise<ActionResult> {
  const invalid = parseId(id, "Academic year was not found.");
  if (invalid) return invalid;
  const parsed = academicYearSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return denied;

  const { data: existing, error: lookupError } = await supabase
    .from("academic_years")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) return fail(lookupError.message);
  if (!existing) return fail("That academic year could not be updated.");

  const duplicate = await nameTaken(
    supabase,
    "academic_years",
    parsed.data.name,
    "A year with this name already exists.",
    id,
  );
  if (duplicate) return duplicate;

  if (parsed.data.is_current) {
    const cleared = await clearCurrent(supabase, "academic_years");
    if (cleared) return cleared;
  }

  const { data, error } = await supabase
    .from("academic_years")
    .update({
      name: parsed.data.name,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      is_current: parsed.data.is_current,
    })
    .eq("id", id)
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "That academic year could not be updated.",
    "That academic year could not be updated.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

export async function markAcademicYearCurrent(
  id: string,
): Promise<ActionResult> {
  const invalid = parseId(id, "Academic year was not found.");
  if (invalid) return invalid;

  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return denied;

  const { data: existing, error: lookupError } = await supabase
    .from("academic_years")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) return fail(lookupError.message);
  if (!existing) return fail("That academic year could not be marked current.");

  const cleared = await clearCurrent(supabase, "academic_years");
  if (cleared) return cleared;

  const { data, error } = await supabase
    .from("academic_years")
    .update({ is_current: true })
    .eq("id", id)
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "That academic year could not be marked current.",
    "That academic year could not be marked current.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

export async function deleteAcademicYear(id: string): Promise<ActionResult> {
  const invalid = parseId(id, "Academic year was not found.");
  if (invalid) return invalid;

  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return denied;

  const { data: terms, error: termsError } = await supabase
    .from("terms")
    .select("id")
    .eq("academic_year_id", id)
    .limit(1)
    .returns<{ id: string }[]>();
  if (termsError) return fail(termsError.message);
  if (terms && terms.length > 0) {
    return fail(
      "This academic year has terms. Remove the terms before deleting the year.",
    );
  }

  const { data, error } = await supabase
    .from("academic_years")
    .delete()
    .eq("id", id)
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "That academic year could not be deleted.",
    "This academic year has terms. Remove the terms before deleting the year.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

async function loadYearBounds(supabase: SupabaseClient, yearId: string) {
  const { data, error } = await supabase
    .from("academic_years")
    .select("id, name, start_date, end_date")
    .eq("id", yearId)
    .maybeSingle();
  return {
    error: error?.message ?? null,
    year: (data ?? null) as {
      id: string;
      name: string;
      start_date: string;
      end_date: string;
    } | null,
  };
}

async function termNameTaken(
  supabase: SupabaseClient,
  yearId: string,
  name: string,
  exceptId?: string,
): Promise<{ ok: false; error: string } | null> {
  let query = supabase
    .from("terms")
    .select("id")
    .eq("academic_year_id", yearId)
    .eq("name", name);
  if (exceptId) query = query.neq("id", exceptId);
  const { data, error } = await query.limit(1).returns<{ id: string }[]>();
  if (error) return fail(error.message);
  if (data && data.length > 0) {
    return fail("A term with this name already exists for this academic year.");
  }
  return null;
}

async function validateTerm(
  supabase: SupabaseClient,
  input: TermInput,
  exceptId?: string,
): Promise<{ ok: true; value: TermInput } | { ok: false; error: string }> {
  const parsed = termSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const loaded = await loadYearBounds(supabase, parsed.data.academic_year_id);
  if (loaded.error) return fail(loaded.error);
  if (!loaded.year) return fail("Academic year was not found.");

  if (parsed.data.end_date <= parsed.data.start_date) {
    return fail("End date must be after the start date.");
  }
  const outside = termOutsideYearMessage(parsed.data, loaded.year);
  if (outside) return fail(outside);

  const duplicate = await termNameTaken(
    supabase,
    parsed.data.academic_year_id,
    parsed.data.name,
    exceptId,
  );
  if (duplicate) return duplicate;

  return { ok: true, value: parsed.data };
}

export async function createTerm(input: TermInput): Promise<ActionResult> {
  const supabase = await createClient();
  const tenant = await requireTenantId(supabase);
  if (isTenantFailure(tenant)) return tenant;

  const validated = await validateTerm(supabase, input);
  if (!validated.ok) return validated;

  if (validated.value.is_current) {
    const cleared = await clearCurrent(supabase, "terms");
    if (cleared) return cleared;
  }

  const { data, error } = await supabase
    .from("terms")
    .insert({
      tenant_id: tenant.tenantId,
      academic_year_id: validated.value.academic_year_id,
      name: validated.value.name,
      start_date: validated.value.start_date,
      end_date: validated.value.end_date,
      is_current: validated.value.is_current,
    })
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "The term was not created.",
    "The term was not created.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

export async function updateTerm(
  id: string,
  input: TermInput,
): Promise<ActionResult> {
  const invalid = parseId(id, "Term was not found.");
  if (invalid) return invalid;

  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return denied;

  const { data: existing, error: lookupError } = await supabase
    .from("terms")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) return fail(lookupError.message);
  if (!existing) return fail("That term could not be updated.");

  const validated = await validateTerm(supabase, input, id);
  if (!validated.ok) return validated;

  if (validated.value.is_current) {
    const cleared = await clearCurrent(supabase, "terms");
    if (cleared) return cleared;
  }

  const { data, error } = await supabase
    .from("terms")
    .update({
      academic_year_id: validated.value.academic_year_id,
      name: validated.value.name,
      start_date: validated.value.start_date,
      end_date: validated.value.end_date,
      is_current: validated.value.is_current,
    })
    .eq("id", id)
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "That term could not be updated.",
    "That term could not be updated.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

export async function markTermCurrent(id: string): Promise<ActionResult> {
  const invalid = parseId(id, "Term was not found.");
  if (invalid) return invalid;

  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return denied;

  const { data: existing, error: lookupError } = await supabase
    .from("terms")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) return fail(lookupError.message);
  if (!existing) return fail("That term could not be marked current.");

  const cleared = await clearCurrent(supabase, "terms");
  if (cleared) return cleared;

  const { data, error } = await supabase
    .from("terms")
    .update({ is_current: true })
    .eq("id", id)
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "That term could not be marked current.",
    "That term could not be marked current.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

export async function deleteTerm(id: string): Promise<ActionResult> {
  const invalid = parseId(id, "Term was not found.");
  if (invalid) return invalid;

  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return denied;

  const { data, error } = await supabase
    .from("terms")
    .delete()
    .eq("id", id)
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "That term could not be deleted.",
    "This term is used by a course. Remove that course before deleting the term.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

function gradeLevel(value: string): string | null {
  return value.length > 0 ? value : null;
}

export async function createClass(input: ClassInput): Promise<ActionResult> {
  const parsed = classSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const supabase = await createClient();
  const tenant = await requireTenantId(supabase);
  if (isTenantFailure(tenant)) return tenant;

  const duplicate = await nameTaken(
    supabase,
    "classes",
    parsed.data.name,
    "A class with this name already exists.",
  );
  if (duplicate) return duplicate;

  const { data, error } = await supabase
    .from("classes")
    .insert({
      tenant_id: tenant.tenantId,
      name: parsed.data.name,
      grade_level: gradeLevel(parsed.data.grade_level),
    })
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "The class was not created.",
    "The class was not created.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

export async function updateClass(
  id: string,
  input: ClassInput,
): Promise<ActionResult> {
  const invalid = parseId(id, "Class was not found.");
  if (invalid) return invalid;
  const parsed = classSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return denied;

  const duplicate = await nameTaken(
    supabase,
    "classes",
    parsed.data.name,
    "A class with this name already exists.",
    id,
  );
  if (duplicate) return duplicate;

  const { data, error } = await supabase
    .from("classes")
    .update({
      name: parsed.data.name,
      grade_level: gradeLevel(parsed.data.grade_level),
    })
    .eq("id", id)
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "That class could not be updated.",
    "That class could not be updated.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

export async function deleteClass(id: string): Promise<ActionResult> {
  const invalid = parseId(id, "Class was not found.");
  if (invalid) return invalid;

  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return denied;

  const { data: links, error: linksError } = await supabase
    .from("class_subjects")
    .select("id")
    .eq("class_id", id)
    .limit(1)
    .returns<{ id: string }[]>();
  if (linksError) return fail(linksError.message);
  if (links && links.length > 0) {
    return fail(
      "This class has subjects linked to it. Unlink them before deleting the class.",
    );
  }

  const { data, error } = await supabase
    .from("classes")
    .delete()
    .eq("id", id)
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "That class could not be deleted.",
    "This class has subjects linked to it. Unlink them before deleting the class.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

export async function createSubject(
  input: SubjectInput,
): Promise<ActionResult> {
  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const supabase = await createClient();
  const tenant = await requireTenantId(supabase);
  if (isTenantFailure(tenant)) return tenant;

  const duplicate = await nameTaken(
    supabase,
    "subjects",
    parsed.data.name,
    "A subject with this name already exists.",
  );
  if (duplicate) return duplicate;

  const { data, error } = await supabase
    .from("subjects")
    .insert({
      tenant_id: tenant.tenantId,
      name: parsed.data.name,
    })
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "The subject was not created.",
    "The subject was not created.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

export async function updateSubject(
  id: string,
  input: SubjectInput,
): Promise<ActionResult> {
  const invalid = parseId(id, "Subject was not found.");
  if (invalid) return invalid;
  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return denied;

  const duplicate = await nameTaken(
    supabase,
    "subjects",
    parsed.data.name,
    "A subject with this name already exists.",
    id,
  );
  if (duplicate) return duplicate;

  const { data, error } = await supabase
    .from("subjects")
    .update({ name: parsed.data.name })
    .eq("id", id)
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "That subject could not be updated.",
    "That subject could not be updated.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  const invalid = parseId(id, "Subject was not found.");
  if (invalid) return invalid;

  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return denied;

  const { data: links, error: linksError } = await supabase
    .from("class_subjects")
    .select("id")
    .eq("subject_id", id)
    .limit(1)
    .returns<{ id: string }[]>();
  if (linksError) return fail(linksError.message);
  if (links && links.length > 0) {
    return fail(
      "This subject is linked to one or more classes. Unlink them before deleting the subject.",
    );
  }

  const { data, error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", id)
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "That subject could not be deleted.",
    "This subject is linked to one or more classes. Unlink them before deleting the subject.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

export async function createClassSubject(
  input: ClassSubjectInput,
): Promise<ActionResult> {
  const parsed = classSubjectSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const supabase = await createClient();
  const tenant = await requireTenantId(supabase);
  if (isTenantFailure(tenant)) return tenant;

  const { data: schoolClass, error: classError } = await supabase
    .from("classes")
    .select("id")
    .eq("id", parsed.data.class_id)
    .maybeSingle();
  if (classError) return fail(classError.message);
  if (!schoolClass) return fail("Class was not found.");

  const { data: subject, error: subjectError } = await supabase
    .from("subjects")
    .select("id")
    .eq("id", parsed.data.subject_id)
    .maybeSingle();
  if (subjectError) return fail(subjectError.message);
  if (!subject) return fail("Subject was not found.");

  const { data: existing, error: existingError } = await supabase
    .from("class_subjects")
    .select("id")
    .eq("class_id", parsed.data.class_id)
    .eq("subject_id", parsed.data.subject_id)
    .limit(1)
    .returns<{ id: string }[]>();
  if (existingError) return fail(existingError.message);
  if (existing && existing.length > 0) {
    return fail("This subject is already linked to that class.");
  }

  const { data, error } = await supabase
    .from("class_subjects")
    .insert({
      tenant_id: tenant.tenantId,
      class_id: parsed.data.class_id,
      subject_id: parsed.data.subject_id,
    })
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "The class and subject were not linked.",
    "The class and subject were not linked.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}

export async function deleteClassSubject(id: string): Promise<ActionResult> {
  const invalid = parseId(id, "That class link could not be removed.");
  if (invalid) return invalid;

  const supabase = await createClient();
  const denied = await requireUser(supabase);
  if (denied) return denied;

  const { data, error } = await supabase
    .from("class_subjects")
    .delete()
    .eq("id", id)
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(
    data,
    error,
    "That class link could not be removed.",
    "That class link is still used by a course.",
  );
  if (rejected) return rejected;

  revalidateAcademic();
  return { ok: true };
}
