"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { z } from "zod";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ROW_LIMIT = 100;
const emailSchema = z.string().trim().email().max(320);

export type ImportRole = "student" | "teacher";

export type ImportRowResult = {
  row: number;
  email: string;
  ok: boolean;
  message: string;
  temporaryPassword?: string;
};

export type ImportPeopleResult =
  | { ok: false; error: string }
  | { ok: true; rows: ImportRowResult[] };

const STUDENT_COLUMNS = ["first_name", "last_name", "email", "class_name"] as const;
const TEACHER_COLUMNS = [...STUDENT_COLUMNS, "subject_name"] as const;

function fail(error: string): ImportPeopleResult {
  return { ok: false, error };
}

function temporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(randomBytes(12), (byte) => alphabet[byte % alphabet.length]).join("");
}

function revalidateImported() {
  revalidatePath("/admin/people/students");
  revalidatePath("/admin/people/teachers");
  revalidatePath("/admin/academic/classes");
  revalidatePath("/teacher/home");
  revalidatePath("/teacher/grading");
  revalidatePath("/classes");
}

async function requireSchoolAdmin(): Promise<
  { tenantId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, error: "You need to sign in again." };
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) return { ok: false, error: "You need to sign in again." };
  const claims = readAccessTokenClaims(accessToken);
  if (!claims.tenantId || !claims.app_roles.includes("school_admin")) {
    return { ok: false, error: "Only a school admin can import people." };
  }
  return { tenantId: claims.tenantId };
}

type CsvRow = Record<string, string | undefined>;

function cell(row: CsvRow, key: string): string {
  return (row[key] ?? "").trim();
}

export async function importPeopleCsv(
  role: ImportRole,
  formData: FormData,
): Promise<ImportPeopleResult> {
  if (role !== "student" && role !== "teacher") return fail("That import is not available.");
  const session = await requireSchoolAdmin();
  if ("ok" in session) return session;

  const file = formData.get("file");
  if (!(file instanceof File)) return fail("Choose a CSV file.");
  if (file.size > 1024 * 1024) return fail("That file is larger than 1 MB.");
  const text = await file.text();

  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().toLowerCase(),
  });
  const fields = parsed.meta.fields ?? [];
  const required = role === "student" ? STUDENT_COLUMNS : TEACHER_COLUMNS;
  const missing = required.filter((column) => !fields.includes(column));
  if (missing.length > 0) {
    return fail(`The CSV needs these columns: ${missing.join(", ")}.`);
  }
  const data = parsed.data;
  if (data.length === 0) return fail("The CSV has no rows to import.");
  if (data.length > ROW_LIMIT) {
    return fail(`Import up to ${ROW_LIMIT} rows at a time.`);
  }

  const admin = createAdminClient();
  const year = await admin
    .from("academic_years")
    .select("id")
    .eq("tenant_id", session.tenantId)
    .eq("is_current", true)
    .maybeSingle<{ id: string }>();
  if (year.error) return fail(year.error.message);
  if (!year.data) {
    return fail("Set a current academic year under Academic before importing.");
  }

  const [classResult, subjectResult, linkResult] = await Promise.all([
    admin.from("classes").select("id, name").eq("tenant_id", session.tenantId),
    admin.from("subjects").select("id, name").eq("tenant_id", session.tenantId),
    admin
      .from("class_subjects")
      .select("id, class_id, subject_id")
      .eq("tenant_id", session.tenantId),
  ]);
  if (classResult.error) return fail(classResult.error.message);
  if (subjectResult.error) return fail(subjectResult.error.message);
  if (linkResult.error) return fail(linkResult.error.message);

  const classesByName = new Map<string, { id: string }[]>();
  for (const row of classResult.data ?? []) {
    const key = String(row.name).trim().toLowerCase();
    const list = classesByName.get(key) ?? [];
    list.push({ id: String(row.id) });
    classesByName.set(key, list);
  }
  const subjectsByName = new Map<string, string>();
  for (const row of subjectResult.data ?? []) {
    subjectsByName.set(String(row.name).trim().toLowerCase(), String(row.id));
  }
  const linkByPair = new Map<string, string>();
  for (const row of linkResult.data ?? []) {
    linkByPair.set(`${row.class_id}:${row.subject_id}`, String(row.id));
  }

  const seen = new Set<string>();
  const results: ImportRowResult[] = [];

  for (const [index, raw] of data.entries()) {
    const rowNumber = index + 2;
    const email = cell(raw, "email").toLowerCase();
    const firstName = cell(raw, "first_name");
    const lastName = cell(raw, "last_name");
    const className = cell(raw, "class_name");
    const subjectName = cell(raw, "subject_name");
    const fullName = `${firstName} ${lastName}`.trim();

    const rejected = validateRow({
      role,
      email,
      firstName,
      lastName,
      className,
      subjectName,
      seen,
      classesByName,
      subjectsByName,
      linkByPair,
    });
    if (typeof rejected === "string") {
      results.push({ row: rowNumber, email, ok: false, message: rejected });
      continue;
    }
    seen.add(email);

    const password = temporaryPassword();
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (created.error || !created.data.user) {
      const message = created.error?.message.toLowerCase() ?? "";
      results.push({
        row: rowNumber,
        email,
        ok: false,
        message: message.includes("already")
          ? "That email already has an account."
          : (created.error?.message ?? "The account was not created."),
      });
      continue;
    }
    const userId = created.data.user.id;

    const profile = await admin.from("profiles").insert({
      id: userId,
      tenant_id: session.tenantId,
      full_name: fullName,
      email,
    });
    if (profile.error) {
      await admin.auth.admin.deleteUser(userId);
      results.push({ row: rowNumber, email, ok: false, message: profile.error.message });
      continue;
    }

    const membership = await admin.from("memberships").insert({
      tenant_id: session.tenantId,
      profile_id: userId,
      role,
      status: "active",
    });
    if (membership.error) {
      await admin.auth.admin.deleteUser(userId);
      results.push({ row: rowNumber, email, ok: false, message: membership.error.message });
      continue;
    }

    if (rejected.kind === "student") {
      const enrollment = await admin.from("enrollments").insert({
        tenant_id: session.tenantId,
        student_id: userId,
        class_id: rejected.classId,
        academic_year_id: year.data.id,
        status: "active",
      });
      if (enrollment.error) {
        await admin.auth.admin.deleteUser(userId);
        results.push({ row: rowNumber, email, ok: false, message: enrollment.error.message });
        continue;
      }
    } else {
      const assignment = await admin.from("teacher_assignments").insert({
        tenant_id: session.tenantId,
        teacher_id: userId,
        class_subject_id: rejected.classSubjectId,
        role: "lead",
      });
      if (assignment.error) {
        await admin.auth.admin.deleteUser(userId);
        results.push({ row: rowNumber, email, ok: false, message: assignment.error.message });
        continue;
      }
    }

    results.push({
      row: rowNumber,
      email,
      ok: true,
      message: "Created",
      temporaryPassword: password,
    });
  }

  if (results.some((row) => row.ok)) revalidateImported();
  return { ok: true, rows: results };
}

function validateRow(input: {
  role: ImportRole;
  email: string;
  firstName: string;
  lastName: string;
  className: string;
  subjectName: string;
  seen: Set<string>;
  classesByName: Map<string, { id: string }[]>;
  subjectsByName: Map<string, string>;
  linkByPair: Map<string, string>;
}): string | { kind: "student"; classId: string } | { kind: "teacher"; classId: string; classSubjectId: string } {
  if (!input.firstName || !input.lastName) return "First name and last name are required.";
  if (!emailSchema.safeParse(input.email).success) return "Enter a valid email address.";
  if (input.seen.has(input.email)) return "That email is repeated in this file.";
  if (!input.className) return "Class name is required.";

  const matches = input.classesByName.get(input.className.toLowerCase()) ?? [];
  if (matches.length === 0) return `No class is named ${input.className}.`;
  if (matches.length > 1) return `More than one class is named ${input.className}.`;
  const classId = matches[0].id;

  if (input.role === "student") return { kind: "student", classId };
  if (!input.subjectName) return "Subject name is required.";
  const subjectId = input.subjectsByName.get(input.subjectName.toLowerCase());
  if (!subjectId) return `No subject is named ${input.subjectName}.`;
  const classSubjectId = input.linkByPair.get(`${classId}:${subjectId}`);
  if (!classSubjectId) {
    return `${input.subjectName} is not linked to ${input.className}.`;
  }
  return { kind: "teacher", classId, classSubjectId };
}
