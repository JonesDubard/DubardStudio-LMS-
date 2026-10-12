import type { Metadata } from "next";
import Link from "next/link";
import { LessonEditorForm } from "@/components/teacher/LessonEditorForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  getLessonById,
  getSignedInTeacherId,
  getTeacherCourses,
} from "@/lib/queries/lessons";
import { NO_CLASSES_ASSIGNED_MESSAGE } from "@/lib/teacher/assignment-stub";
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
  const teacherId = await getSignedInTeacherId(supabase);
  const [courses, lesson] = await Promise.all([
    getTeacherCourses(supabase, teacherId),
    getLessonById(supabase, lessonId),
  ]);
  const course = lesson
    ? courses.find((row) => row.id === lesson.course_id)
    : undefined;

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">Lessons / Lesson</p>
        <div className="mt-1 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">
              {course && lesson ? lesson.title : "Lesson"}
            </h1>
            <p className="text-sm text-[#666666]">
              {course
                ? `${course.class_name} · ${course.subject_name}`
                : "This lesson is not on a course assigned to you."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/teacher/lessons"
              className="border border-[#999999] bg-white px-4 py-2 text-sm"
            >
              All Lessons
            </Link>
            {course && lesson ? (
              <StatusBadge
                label={statusLabel(lesson.status)}
                className="border border-[#999999] px-3 py-2 text-sm"
              />
            ) : null}
          </div>
        </div>
      </header>

      <div className="max-w-5xl p-8">
        {courses.length === 0 ? (
          <p className="border border-[#999999] bg-white px-4 py-6 text-sm">
            {NO_CLASSES_ASSIGNED_MESSAGE}
          </p>
        ) : !lesson || !course ? (
          <p className="border border-[#999999] bg-white px-4 py-6 text-sm">
            This lesson is not available.
          </p>
        ) : (
          <LessonEditorForm
            key={lesson.updated_at}
            mode="edit"
            lesson={lesson}
            course={course}
          />
        )}
      </div>
    </main>
  );
}
