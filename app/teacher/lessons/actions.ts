"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
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

  const courses = await getTeacherCourses(supabase, session.userId);
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

  const courses = await getTeacherCourses(supabase, session.userId);
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
