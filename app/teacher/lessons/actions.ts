"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import { firstZodMessage, type ActionResult } from "@/lib/academic/schema";
import {
  createLessonSchema,
  lessonContentSchema,
  type CreateLessonInput,
  type LessonContentInput,
} from "@/lib/lessons/schema";
import { getLessonById, getTeacherCourses } from "@/lib/queries/lessons";
import { createClient } from "@/lib/supabase/server";

type DbError = { message: string; code?: string };

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function dbMessage(error: DbError): string {
  if (error.code === "23503") {
    return "The lesson was not saved. Check the course and try again.";
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
): { ok: false; error: string } | null {
  if (error) return fail(dbMessage(error));
  if (!data || data.length === 0) return fail(emptyMessage);
  return null;
}

/**
 * Inserts must include tenant_id from the access-token claim, the same read
 * as the academic actions. created_by is the signed-in profile id, which is
 * the auth user id.
 */
async function requireSession(
  supabase: SupabaseClient,
): Promise<
  { userId: string; tenantId: string } | { ok: false; error: string }
> {
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
  return { userId: userData.user.id, tenantId };
}

function isSessionFailure(
  value: { userId: string; tenantId: string } | { ok: false; error: string },
): value is { ok: false; error: string } {
  return "ok" in value;
}

function revalidateLessons(lessonId?: string) {
  revalidatePath("/teacher/home");
  revalidatePath("/teacher/lessons");
  revalidatePath("/teacher/lessons/new");
  if (lessonId) revalidatePath(`/teacher/lessons/${lessonId}`);
}

function blankToNull(value: string): string | null {
  return value.length > 0 ? value : null;
}

export async function createLesson(
  input: CreateLessonInput,
  publish: boolean,
): Promise<ActionResult> {
  const parsed = createLessonSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const supabase = await createClient();
  const session = await requireSession(supabase);
  if (isSessionFailure(session)) return session;

  const courses = await getTeacherCourses(supabase);
  const course = courses.find((row) => row.id === parsed.data.course_id);
  if (!course) return fail("Choose a course you are assigned to.");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      tenant_id: session.tenantId,
      course_id: parsed.data.course_id,
      title: parsed.data.title,
      description: blankToNull(parsed.data.description),
      status: publish ? "published" : "draft",
      published_at: publish ? now : null,
      created_by: session.userId,
    })
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(data, error, "The lesson was not created.");
  if (rejected) return rejected;

  revalidateLessons(data?.[0]?.id);
  return { ok: true };
}

export async function updateLesson(
  lessonId: string,
  input: LessonContentInput,
  publish: boolean,
): Promise<ActionResult> {
  const parsed = lessonContentSchema.safeParse(input);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const supabase = await createClient();
  const session = await requireSession(supabase);
  if (isSessionFailure(session)) return session;

  const lesson = await getLessonById(supabase, lessonId);
  if (!lesson) return fail("The lesson was not found.");

  const courses = await getTeacherCourses(supabase);
  const assigned = courses.some((course) => course.id === lesson.course_id);
  if (!assigned) return fail("The lesson was not found.");

  const now = new Date().toISOString();
  const changes: {
    title: string;
    description: string | null;
    updated_at: string;
    status?: "published";
    published_at?: string;
  } = {
    title: parsed.data.title,
    description: blankToNull(parsed.data.description),
    updated_at: now,
  };
  if (publish) {
    changes.status = "published";
    changes.published_at = now;
  }

  const { data, error } = await supabase
    .from("lessons")
    .update(changes)
    .eq("id", lesson.id)
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(data, error, "The lesson was not saved.");
  if (rejected) return rejected;

  revalidateLessons(lesson.id);
  return { ok: true };
}

const courseIdSchema = z.string().uuid("Choose a course.");

export type DuplicateLessonResult =
  | { ok: true; lessonId: string }
  | { ok: false; error: string };

/**
 * Copies a lesson the teacher can read into one of their courses as a draft.
 * Materials are copied. Assessments are not.
 */
export async function duplicateLesson(
  lessonId: string,
  courseId: string,
): Promise<DuplicateLessonResult> {
  const parsedCourse = courseIdSchema.safeParse(courseId);
  if (!parsedCourse.success) return fail(firstZodMessage(parsedCourse.error));

  const supabase = await createClient();
  const session = await requireSession(supabase);
  if (isSessionFailure(session)) return session;

  const lesson = await getLessonById(supabase, lessonId);
  if (!lesson) return fail("The lesson was not found.");

  const courses = await getTeacherCourses(supabase);
  const sourceOwned = courses.some((course) => course.id === lesson.course_id);
  const destination = courses.find((course) => course.id === parsedCourse.data);
  if (!sourceOwned || !destination) {
    return fail("Choose a course you are assigned to.");
  }

  const { data: created, error: createError } = await supabase
    .from("lessons")
    .insert({
      tenant_id: session.tenantId,
      course_id: destination.id,
      title: lesson.title,
      description: lesson.description,
      status: "draft",
      published_at: null,
      created_by: session.userId,
    })
    .select("id")
    .returns<{ id: string }[]>();

  const rejected = wroteRows(created, createError, "The lesson was not copied.");
  if (rejected || !created?.[0]) return rejected ?? fail("The lesson was not copied.");
  const newLessonId = created[0].id;

  const materialResult = await supabase
    .from("lesson_materials")
    .select("kind, file_id, external_url, sort_order")
    .eq("lesson_id", lesson.id)
    .returns<
      {
        kind: string;
        file_id: string | null;
        external_url: string | null;
        sort_order: number;
      }[]
    >();
  if (materialResult.error) {
    await supabase.from("lessons").delete().eq("id", newLessonId);
    return fail(materialResult.error.message);
  }

  const materials = materialResult.data ?? [];
  if (materials.length > 0) {
    const { data: copied, error: copyError } = await supabase
      .from("lesson_materials")
      .insert(
        materials.map((material) => ({
          tenant_id: session.tenantId,
          lesson_id: newLessonId,
          kind: material.kind,
          file_id: material.file_id,
          external_url: material.external_url,
          sort_order: material.sort_order,
        })),
      )
      .select("id")
      .returns<{ id: string }[]>();
    if (copyError || !copied || copied.length !== materials.length) {
      await supabase.from("lessons").delete().eq("id", newLessonId);
      return fail(copyError ? dbMessage(copyError) : "The lesson materials were not copied.");
    }
  }

  revalidateLessons(newLessonId);
  revalidatePath(`/teacher/lessons/${lesson.id}/reuse`);
  return { ok: true, lessonId: newLessonId };
}

const MATERIAL_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MATERIAL_FILE_LIMIT = 10 * 1024 * 1024;
const materialUrlSchema = z.string().trim().url("Enter a valid link.").max(2000);

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned.slice(0, 80) || "file";
}

function materialKind(mime: string): "pdf" | "doc" | "image" {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  return "doc";
}

async function assignedLesson(
  supabase: SupabaseClient,
  session: { userId: string; tenantId: string },
  lessonId: string,
) {
  const lesson = await getLessonById(supabase, lessonId);
  if (!lesson) return fail("The lesson was not found.");
  const courses = await getTeacherCourses(supabase);
  if (!courses.some((course) => course.id === lesson.course_id)) {
    return fail("The lesson was not found.");
  }
  return lesson;
}

async function nextSortOrder(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<number | { ok: false; error: string }> {
  const result = await supabase
    .from("lesson_materials")
    .select("sort_order")
    .eq("lesson_id", lessonId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .returns<{ sort_order: number }[]>();
  if (result.error) return fail(result.error.message);
  return (result.data?.[0]?.sort_order ?? -1) + 1;
}

export async function addLessonFile(
  lessonId: string,
  file: File,
): Promise<ActionResult> {
  if (!(file instanceof File) || file.size <= 0) return fail("Choose a file to attach.");
  if (file.size > MATERIAL_FILE_LIMIT) return fail("That file is larger than 10 MB.");
  if (!MATERIAL_FILE_TYPES.has(file.type)) {
    return fail("Use a PDF, Word document, or JPEG, PNG, or WebP image.");
  }

  const supabase = await createClient();
  const session = await requireSession(supabase);
  if (isSessionFailure(session)) return session;
  const lesson = await assignedLesson(supabase, session, lessonId);
  if ("ok" in lesson) return lesson;

  const fileId = crypto.randomUUID();
  const storagePath = `${session.tenantId}/lessons/${lesson.id}/${fileId}/${safeFileName(file.name)}`;
  const uploaded = await supabase.storage.from("tenant-files").upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploaded.error) return fail(uploaded.error.message);

  const inserted = await supabase
    .from("files")
    .insert({
      id: fileId,
      tenant_id: session.tenantId,
      storage_path: storagePath,
      original_name: file.name.slice(0, 200),
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: session.userId,
    })
    .select("id")
    .returns<{ id: string }[]>();
  if (inserted.error || !inserted.data?.length) {
    await supabase.storage.from("tenant-files").remove([storagePath]);
    return fail(inserted.error ? dbMessage(inserted.error) : "The file was not saved.");
  }

  const sortOrder = await nextSortOrder(supabase, lesson.id);
  if (typeof sortOrder !== "number") {
    await supabase.from("files").delete().eq("id", fileId);
    await supabase.storage.from("tenant-files").remove([storagePath]);
    return sortOrder;
  }

  const material = await supabase
    .from("lesson_materials")
    .insert({
      tenant_id: session.tenantId,
      lesson_id: lesson.id,
      kind: materialKind(file.type),
      file_id: fileId,
      external_url: null,
      sort_order: sortOrder,
    })
    .select("id")
    .returns<{ id: string }[]>();
  if (material.error || !material.data?.length) {
    await supabase.from("files").delete().eq("id", fileId);
    await supabase.storage.from("tenant-files").remove([storagePath]);
    return fail(material.error ? dbMessage(material.error) : "The material was not added.");
  }

  revalidateLessons(lesson.id);
  revalidatePath(`/lessons/${lesson.id}`);
  return { ok: true };
}

export async function addLessonLink(
  lessonId: string,
  url: string,
): Promise<ActionResult> {
  const parsed = materialUrlSchema.safeParse(url);
  if (!parsed.success) return fail(firstZodMessage(parsed.error));

  const supabase = await createClient();
  const session = await requireSession(supabase);
  if (isSessionFailure(session)) return session;
  const lesson = await assignedLesson(supabase, session, lessonId);
  if ("ok" in lesson) return lesson;
  const sortOrder = await nextSortOrder(supabase, lesson.id);
  if (typeof sortOrder !== "number") return sortOrder;

  const material = await supabase
    .from("lesson_materials")
    .insert({
      tenant_id: session.tenantId,
      lesson_id: lesson.id,
      kind: "external_video",
      file_id: null,
      external_url: parsed.data,
      sort_order: sortOrder,
    })
    .select("id")
    .returns<{ id: string }[]>();
  const rejected = wroteRows(material.data, material.error, "The link was not added.");
  if (rejected) return rejected;

  revalidateLessons(lesson.id);
  revalidatePath(`/lessons/${lesson.id}`);
  return { ok: true };
}
