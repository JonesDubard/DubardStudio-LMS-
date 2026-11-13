import type { Metadata } from "next";
import Link from "next/link";
import { LessonEditorForm } from "@/components/teacher/LessonEditorForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { buttonPrimary, buttonSecondary } from "@/lib/ui/styles";
import {
  getLessonById,
  getLessonMaterials,
  getTeacherCourses,
} from "@/lib/queries/lessons";
import { NO_CLASSES_ASSIGNED_MESSAGE } from "@/lib/teacher/messages";
import { createClient } from "@/lib/supabase/server";
import type { LessonStatus } from "@/lib/types/lessons";

export const metadata: Metadata = {
  title: "Lesson",
};

type LessonPageProps = {
  params: Promise<{ lessonId: string }>;
};

function statusLabel(status: LessonStatus): string {
  if (status === "published") return "PUBLISHED";
  if (status === "archived") return "ARCHIVED";
  return "DRAFT";
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const [courses, lesson, materials] = await Promise.all([
    getTeacherCourses(supabase),
    getLessonById(supabase, lessonId),
    getLessonMaterials(supabase, lessonId),
  ]);
  const course = lesson
    ? courses.find((row) => row.id === lesson.course_id)
    : undefined;

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium text-ink-muted">Lessons / Lesson</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold tracking-tight md:text-2xl">
              {course && lesson ? lesson.title : "Lesson"}
            </h1>
            <p className="text-sm text-ink-secondary">
              {course
                ? `${course.class_name} · ${course.subject_name}`
                : "This lesson is not on a course assigned to you."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/teacher/lessons" className={buttonSecondary}>
              All Lessons
            </Link>
            {course && lesson ? (
              <Link
                href={`/teacher/lessons/${lesson.id}/reuse`}
                className={buttonSecondary}
              >
                Duplicate
              </Link>
            ) : null}
            {course && lesson ? (
              <Link
                href={`/teacher/lessons/${lesson.id}/assessments/new`}
                className={buttonPrimary}
              >
                Create Assessment
              </Link>
            ) : null}
            {course && lesson ? (
              <StatusBadge label={statusLabel(lesson.status)} />
            ) : null}
          </div>
        </div>
      </header>

      <div className="max-w-5xl p-4 lg:p-8">
        {courses.length === 0 ? (
          <p className="border border-line bg-surface px-4 py-6 text-sm">
            {NO_CLASSES_ASSIGNED_MESSAGE}
          </p>
        ) : !lesson || !course ? (
          <p className="border border-line bg-surface px-4 py-6 text-sm">
            This lesson is not available.
          </p>
        ) : (
          <LessonEditorForm
            key={`${lesson.updated_at}-${materials.map((item) => item.id).join()}`}
            mode="edit"
            lesson={lesson}
            course={course}
            materials={materials}
          />
        )}
      </div>
    </main>
  );
}
