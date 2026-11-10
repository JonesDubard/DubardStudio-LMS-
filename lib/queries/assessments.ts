"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import { firstZodMessage } from "@/lib/academic/schema";
import {
  createAssessmentSchema,
  type CreateAssessmentInput,
} from "@/lib/assessments/schema";
import { getLessonById } from "@/lib/queries/lessons";
import { createClient } from "@/lib/supabase/server";
import type {
  AssessmentStatus,
  AssessmentType,
  GradeInput,
  GradeRosterRow,
  SubmissionGradeView,
  TeacherAssessment,
} from "@/lib/types/assessments";

type QueryError = { message: string; code?: string };

type AssessmentRow = {
  id: string;
  course_id: string;
  lesson_id: string | null;
  type: string;
  title: string;
  instructions: string | null;
  due_date: string | null;
  max_score: number | string | null;
  status: string;
  published_at: string | null;
};

type SubmissionRow = {
  id: string;
  student_id: string;
  text_content: string | null;
  file_id: string | null;
  submitted_at: string;
  status: string;
};

type GradeRow = {
  id: string;
  student_id: string;
  submission_id: string | null;
  score: number | string | null;
  feedback: string | null;
  released_at: string | null;
};

const ASSESSMENT_COLUMNS =
  "id, course_id, lesson_id, type, title, instructions, due_date, max_score, status, published_at";

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function unwrap<T>(
  table: string,
  result: { data: T[] | null; error: QueryError | null },
): T[] {
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
  return result.data ?? [];
}

function asNumber(value: number | string | null): number | null {
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function assessmentType(value: string): AssessmentType {
  if (
    value === "assignment" ||
    value === "quiz" ||
    value === "test" ||
    value === "exam"
  ) {
    return value;
  }
  throw new Error(`assessments: unexpected type ${value}`);
}

function assessmentStatus(value: string): AssessmentStatus {
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }
  throw new Error(`assessments: unexpected status ${value}`);
}

function toAssessment(row: AssessmentRow): TeacherAssessment {
  return {
    id: row.id,
    courseId: row.course_id,
    lessonId: row.lesson_id,
    type: assessmentType(row.type),
    title: row.title,
    instructions: row.instructions,
    dueDate: row.due_date,
    maxScore: asNumber(row.max_score),
    status: assessmentStatus(row.status),
    publishedAt: row.published_at,
  };
}

async function namesById(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const result = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ids)
    .returns<{ id: string; full_name: string | null }[]>();
  const rows = unwrap("profiles", result);
  return new Map(rows.map((row) => [row.id, row.full_name ?? "Student"]));
}

export async function getTeacherAssessments(
  supabase: SupabaseClient,
  courseId: string,
): Promise<TeacherAssessment[]> {
  const result = await supabase
    .from("assessments")
    .select(ASSESSMENT_COLUMNS)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .returns<AssessmentRow[]>();
  return unwrap("assessments", result).map(toAssessment);
}

export async function getAssessmentDetails(
  supabase: SupabaseClient,
  assessmentId: string,
): Promise<TeacherAssessment | null> {
  const result = await supabase
    .from("assessments")
    .select(ASSESSMENT_COLUMNS)
    .eq("id", assessmentId)
    .maybeSingle<AssessmentRow>();
  if (result.error) throw new Error(`assessments: ${result.error.message}`);
  return result.data ? toAssessment(result.data) : null;
}

export async function getSubmissionsForAssessment(
  supabase: SupabaseClient,
  assessmentId: string,
): Promise<SubmissionGradeView[]> {
  const submissionResult = await supabase
    .from("submissions")
    .select("id, student_id, text_content, file_id, submitted_at, status")
    .eq("assessment_id", assessmentId)
    .order("submitted_at", { ascending: true })
    .returns<SubmissionRow[]>();
  const submissions = unwrap("submissions", submissionResult);
  if (submissions.length === 0) return [];

  const fileIds = submissions.flatMap((row) => (row.file_id ? [row.file_id] : []));
  const fileNames = new Map<string, string>();
  if (fileIds.length > 0) {
    const fileResult = await supabase
      .from("files")
      .select("id, original_name")
      .in("id", fileIds)
      .returns<{ id: string; original_name: string }[]>();
    for (const file of unwrap("files", fileResult)) {
      fileNames.set(file.id, file.original_name);
    }
  }

  const gradeResult = await supabase
    .from("grades")
    .select("id, student_id, submission_id, score, feedback, released_at")
    .eq("assessment_id", assessmentId)
    .returns<GradeRow[]>();
  const grades = unwrap("grades", gradeResult);
  const gradeByStudent = new Map(grades.map((row) => [row.student_id, row]));
  const names = await namesById(
    supabase,
    submissions.map((row) => row.student_id),
  );

  return submissions.map((row) => {
    const grade = gradeByStudent.get(row.student_id);
    return {
      id: row.id,
      studentId: row.student_id,
      studentName: names.get(row.student_id) ?? "Student",
      text: row.text_content,
      fileName: row.file_id ? (fileNames.get(row.file_id) ?? "Attached file") : null,
      submittedAt: row.submitted_at,
      status: row.status,
      score: grade ? asNumber(grade.score) : null,
      feedback: grade?.feedback ?? null,
      releasedAt: grade?.released_at ?? null,
    };
  });
}

async function courseClassYear(
  supabase: SupabaseClient,
  courseId: string,
): Promise<{ classId: string; academicYearId: string } | null> {
  const courseResult = await supabase
    .from("courses")
    .select("class_subject_id, term_id")
    .eq("id", courseId)
    .maybeSingle<{ class_subject_id: string; term_id: string }>();
  if (courseResult.error) throw new Error(`courses: ${courseResult.error.message}`);
  if (!courseResult.data) return null;

  const [linkResult, termResult] = await Promise.all([
    supabase
      .from("class_subjects")
      .select("class_id")
      .eq("id", courseResult.data.class_subject_id)
      .maybeSingle<{ class_id: string }>(),
    supabase
      .from("terms")
      .select("academic_year_id")
      .eq("id", courseResult.data.term_id)
      .maybeSingle<{ academic_year_id: string }>(),
  ]);
  if (linkResult.error) throw new Error(`class_subjects: ${linkResult.error.message}`);
  if (termResult.error) throw new Error(`terms: ${termResult.error.message}`);
  if (!linkResult.data || !termResult.data) return null;
  return {
    classId: linkResult.data.class_id,
    academicYearId: termResult.data.academic_year_id,
  };
}

export async function getRosterForGradeEntry(
  supabase: SupabaseClient,
  assessmentId: string,
): Promise<GradeRosterRow[]> {
  const assessment = await getAssessmentDetails(supabase, assessmentId);
  if (!assessment) return [];
  const placement = await courseClassYear(supabase, assessment.courseId);
  if (!placement) return [];

  const enrollmentResult = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("class_id", placement.classId)
    .eq("academic_year_id", placement.academicYearId)
    .eq("status", "active")
    .returns<{ student_id: string }[]>();
  const enrollments = unwrap("enrollments", enrollmentResult);
  const studentIds = [...new Set(enrollments.map((row) => row.student_id))];
  if (studentIds.length === 0) return [];

  const gradeResult = await supabase
    .from("grades")
    .select("id, student_id, submission_id, score, feedback, released_at")
    .eq("assessment_id", assessmentId)
    .returns<GradeRow[]>();
  const grades = unwrap("grades", gradeResult);
  const gradeByStudent = new Map(grades.map((row) => [row.student_id, row]));
  const names = await namesById(supabase, studentIds);

  return studentIds
    .map((studentId) => {
      const grade = gradeByStudent.get(studentId);
      const score = grade ? asNumber(grade.score) : null;
      return {
        studentId,
        studentName: names.get(studentId) ?? "Student",
        score: score === null ? "" : String(score),
        feedback: grade?.feedback ?? "",
        releasedAt: grade?.released_at ?? null,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

async function requireSession(
  supabase: SupabaseClient,
): Promise<{ userId: string; tenantId: string } | { ok: false; error: string }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return fail("You need to sign in again.");
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) return fail("You need to sign in again.");
  const { tenantId } = readAccessTokenClaims(accessToken);
  if (!tenantId) return fail("This session has no school.");
  return { userId: userData.user.id, tenantId };
}

function dbMessage(error: QueryError): string {
  const message = error.message;
  if (message.toLowerCase().includes("row-level security")) {
    return "You do not have access to that record.";
  }
  return message;
}

export async function createAssessment(
  input: CreateAssessmentInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = createAssessmentSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const supabase = await createClient();
  const session = await requireSession(supabase);
  if ("ok" in session) return session;

  const lesson = await getLessonById(supabase, parsed.data.lessonId);
  if (!lesson) return fail("That lesson is not available.");

  const dueDate =
    parsed.data.dueDate.trim() === ""
      ? null
      : new Date(parsed.data.dueDate).toISOString();
  const maxScore =
    parsed.data.maxScore.trim() === "" ? null : Number(parsed.data.maxScore);
  const isAssignment = parsed.data.type === "assignment";

  const { data, error } = await supabase
    .from("assessments")
    .insert({
      tenant_id: session.tenantId,
      course_id: lesson.course_id,
      lesson_id: lesson.id,
      type: parsed.data.type,
      title: parsed.data.title,
      due_date: dueDate,
      max_score: maxScore,
      allow_text_entry: isAssignment,
      allow_file_upload: isAssignment,
      status: parsed.data.publish ? "published" : "draft",
      created_by: session.userId,
    })
    .select("id")
    .returns<{ id: string }[]>();

  if (error) return fail(dbMessage(error));
  const id = data?.[0]?.id;
  if (!id) return fail("The assessment was not created.");

  revalidatePath(`/teacher/lessons/${lesson.id}`);
  revalidatePath(`/teacher/assessments/${id}/submissions`);
  revalidatePath("/feed");
  return { ok: true, id };
}

async function writeGrade(
  supabase: SupabaseClient,
  tenantId: string,
  assessmentId: string,
  studentId: string,
  submissionId: string | null,
  score: number | null,
  feedback: string | null,
  release: boolean,
): Promise<{ ok: false; error: string } | null> {
  const existing = await supabase
    .from("grades")
    .select("id, released_at")
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId)
    .maybeSingle<{ id: string; released_at: string | null }>();
  if (existing.error) return fail(dbMessage(existing.error));

  const releasedAt = release ? new Date().toISOString() : null;
  if (existing.data) {
    const { data, error } = await supabase
      .from("grades")
      .update({
        score,
        feedback,
        submission_id: submissionId,
        released_at: existing.data.released_at ?? releasedAt,
      })
      .eq("id", existing.data.id)
      .select("id")
      .returns<{ id: string }[]>();
    if (error) return fail(gradeWriteMessage(error));
    if (!data || data.length === 0) {
      return fail("This student is not actively enrolled in the class for this assessment.");
    }
    return null;
  }

  const { data, error } = await supabase
    .from("grades")
    .insert({
      tenant_id: tenantId,
      assessment_id: assessmentId,
      student_id: studentId,
      submission_id: submissionId,
      score,
      feedback,
      released_at: releasedAt,
    })
    .select("id")
    .returns<{ id: string }[]>();
  if (error) return fail(gradeWriteMessage(error));
  if (!data || data.length === 0) {
    return fail("This student is not actively enrolled in the class for this assessment.");
  }
  return null;
}

function gradeWriteMessage(error: QueryError): string {
  const message = error.message.toLowerCase();
  if (message.includes("row-level security") || message.includes("above the maximum")) {
    if (message.includes("above the maximum")) return error.message;
    return "This student is not actively enrolled in the class for this assessment.";
  }
  return dbMessage(error);
}

function revalidateReleasedGrade(assessmentId: string) {
  revalidatePath(`/teacher/assessments/${assessmentId}/submissions`);
  revalidatePath(`/assignments/${assessmentId}`);
  revalidatePath("/grades");
  revalidatePath("/feed");
  revalidatePath("/parent/grades");
  revalidatePath("/parent/assignments");
}

export async function gradeSubmission(
  submissionId: string,
  score: string,
  feedback: string,
  release: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const numeric = Number(score);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fail("Enter a score of 0 or more.");
  }

  const supabase = await createClient();
  const session = await requireSession(supabase);
  if ("ok" in session) return session;

  const submission = await supabase
    .from("submissions")
    .select("id, assessment_id, student_id")
    .eq("id", submissionId)
    .maybeSingle<{ id: string; assessment_id: string; student_id: string }>();
  if (submission.error) return fail(dbMessage(submission.error));
  if (!submission.data) return fail("That submission is not available.");

  const rejected = await writeGrade(
    supabase,
    session.tenantId,
    submission.data.assessment_id,
    submission.data.student_id,
    submission.data.id,
    numeric,
    feedback.trim() === "" ? null : feedback.trim(),
    release,
  );
  if (rejected) return rejected;

  revalidateReleasedGrade(submission.data.assessment_id);
  return { ok: true };
}

export async function saveGrades(
  assessmentId: string,
  grades: GradeInput[],
  release: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const session = await requireSession(supabase);
  if ("ok" in session) return session;

  const assessment = await getAssessmentDetails(supabase, assessmentId);
  if (!assessment) return fail("That assessment is not available.");
  if (assessment.type === "assignment") {
    return fail("Assignments are graded from each submission.");
  }

  let wrote = 0;
  for (const row of grades) {
    if (row.score.trim() === "" && row.feedback.trim() === "") continue;
    const numeric = row.score.trim() === "" ? null : Number(row.score);
    if (numeric !== null && (!Number.isFinite(numeric) || numeric < 0)) {
      return fail(`Enter a valid score for ${row.studentId}.`);
    }
    const rejected = await writeGrade(
      supabase,
      session.tenantId,
      assessmentId,
      row.studentId,
      null,
      numeric,
      row.feedback.trim() === "" ? null : row.feedback.trim(),
      release,
    );
    if (rejected) return rejected;
    wrote += 1;
  }
  if (wrote === 0) return fail("Enter at least one score.");

  revalidateReleasedGrade(assessmentId);
  return { ok: true };
}

const SUBMISSION_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const SUBMISSION_FILE_LIMIT = 10 * 1024 * 1024;

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned.slice(0, 80) || "file";
}

async function storeStudentFile(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  file: File,
): Promise<{ fileId: string } | { ok: false; error: string }> {
  if (file.size <= 0) return fail("Choose a file to attach.");
  if (file.size > SUBMISSION_FILE_LIMIT) return fail("That file is larger than 10 MB.");
  if (!SUBMISSION_FILE_TYPES.has(file.type)) {
    return fail("Use a PDF, Word document, or JPEG, PNG, or WebP image.");
  }

  const fileId = crypto.randomUUID();
  const storagePath = `${tenantId}/submissions/${userId}/${fileId}/${safeFileName(file.name)}`;
  const uploaded = await supabase.storage.from("tenant-files").upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploaded.error) return fail(uploaded.error.message);

  const inserted = await supabase
    .from("files")
    .insert({
      id: fileId,
      tenant_id: tenantId,
      storage_path: storagePath,
      original_name: file.name.slice(0, 200),
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: userId,
    })
    .select("id")
    .returns<{ id: string }[]>();
  if (inserted.error || !inserted.data || inserted.data.length === 0) {
    await supabase.storage.from("tenant-files").remove([storagePath]);
    return fail(inserted.error ? dbMessage(inserted.error) : "The file was not saved.");
  }
  return { fileId };
}

export async function submitAssignment(
  assessmentId: string,
  text: string,
  file?: File | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const answer = text.trim();
  const attachment = file && file.size > 0 ? file : null;
  if (!answer && !attachment) return fail("Write an answer or attach a file before handing in.");

  const supabase = await createClient();
  const session = await requireSession(supabase);
  if ("ok" in session) return session;

  let fileId: string | null = null;
  if (attachment) {
    const stored = await storeStudentFile(supabase, session.tenantId, session.userId, attachment);
    if ("ok" in stored) return stored;
    fileId = stored.fileId;
  }

  const existing = await supabase
    .from("submissions")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq("student_id", session.userId)
    .maybeSingle<{ id: string }>();
  if (existing.error) return fail(dbMessage(existing.error));

  if (existing.data) {
    if (!fileId) return fail("You already handed this in.");
    const updated = await supabase
      .from("submissions")
      .update({ file_id: fileId })
      .eq("id", existing.data.id)
      .select("id")
      .returns<{ id: string }[]>();
    if (updated.error) return fail(dbMessage(updated.error));
    if (!updated.data || updated.data.length === 0) {
      return fail("The file was not attached.");
    }
  } else {
    const { data, error } = await supabase
      .from("submissions")
      .insert({
        tenant_id: session.tenantId,
        assessment_id: assessmentId,
        student_id: session.userId,
        text_content: answer || null,
        file_id: fileId,
      })
      .select("id")
      .returns<{ id: string }[]>();
    if (error) return fail(dbMessage(error));
    if (!data || data.length === 0) return fail("The assignment was not handed in.");
  }

  revalidatePath(`/assignments/${assessmentId}`);
  revalidatePath(`/teacher/assessments/${assessmentId}/submissions`);
  return { ok: true };
}

export async function openSubmissionFile(
  submissionId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const session = await requireSession(supabase);
  if ("ok" in session) return session;

  const submission = await supabase
    .from("submissions")
    .select("file_id")
    .eq("id", submissionId)
    .maybeSingle<{ file_id: string | null }>();
  if (submission.error) return fail(dbMessage(submission.error));
  if (!submission.data?.file_id) return fail("This submission has no file.");

  const file = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", submission.data.file_id)
    .maybeSingle<{ storage_path: string }>();
  if (file.error) return fail(dbMessage(file.error));
  if (!file.data) return fail("That file is not available.");

  const signed = await supabase.storage
    .from("tenant-files")
    .createSignedUrl(file.data.storage_path, 120);
  if (signed.error || !signed.data?.signedUrl) {
    return fail(signed.error?.message ?? "The file could not be opened.");
  }
  return { ok: true, url: signed.data.signedUrl };
}

export async function openLessonMaterial(
  materialId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const session = await requireSession(supabase);
  if ("ok" in session) return session;

  const material = await supabase
    .from("lesson_materials")
    .select("file_id")
    .eq("id", materialId)
    .maybeSingle<{ file_id: string | null }>();
  if (material.error) return fail(dbMessage(material.error));
  if (!material.data?.file_id) return fail("This material has no file.");

  const file = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", material.data.file_id)
    .maybeSingle<{ storage_path: string }>();
  if (file.error) return fail(dbMessage(file.error));
  if (!file.data) return fail("That file is not available.");

  const signed = await supabase.storage
    .from("tenant-files")
    .createSignedUrl(file.data.storage_path, 120);
  if (signed.error || !signed.data?.signedUrl) {
    return fail(signed.error?.message ?? "The file could not be opened.");
  }
  return { ok: true, url: signed.data.signedUrl };
}

export async function getMySubmission(
  supabase: SupabaseClient,
  assessmentId: string,
): Promise<{ text: string | null; fileName: string | null; submittedAt: string; status: string } | null> {
  const result = await supabase
    .from("submissions")
    .select("text_content, file_id, submitted_at, status")
    .eq("assessment_id", assessmentId)
    .maybeSingle<{
      text_content: string | null;
      file_id: string | null;
      submitted_at: string;
      status: string;
    }>();
  if (result.error) throw new Error(`submissions: ${result.error.message}`);
  if (!result.data) return null;

  let fileName: string | null = null;
  if (result.data.file_id) {
    const file = await supabase
      .from("files")
      .select("original_name")
      .eq("id", result.data.file_id)
      .maybeSingle<{ original_name: string }>();
    if (file.error) throw new Error(`files: ${file.error.message}`);
    fileName = file.data?.original_name ?? "Attached file";
  }

  return {
    text: result.data.text_content,
    fileName,
    submittedAt: result.data.submitted_at,
    status: result.data.status,
  };
}

export async function getMyReleasedGrade(
  supabase: SupabaseClient,
  assessmentId: string,
): Promise<{ score: number | null; feedback: string | null } | null> {
  const result = await supabase
    .from("grades")
    .select("score, feedback, released_at")
    .eq("assessment_id", assessmentId)
    .maybeSingle<{
      score: number | string | null;
      feedback: string | null;
      released_at: string | null;
    }>();
  if (result.error) throw new Error(`grades: ${result.error.message}`);
  if (!result.data || !result.data.released_at) return null;
  return { score: asNumber(result.data.score), feedback: result.data.feedback };
}
