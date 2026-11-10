import type { Metadata } from "next";
import Link from "next/link";
import { getLessonById, getTeacherCourses } from "@/lib/queries/lessons";
import { buttonSecondary, surfaceCard } from "@/lib/ui/styles";
import { createClient } from "@/lib/supabase/server";
import { DuplicateForm } from "./DuplicateForm";

export const metadata: Metadata = {
  title: "Duplicate Lesson",
};

type LessonReusePageProps = {
  params: Promise<{ lessonId: string }>;
};

export default async function LessonReusePage({ params }: LessonReusePageProps) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const [courses, lesson] = await Promise.all([
    getTeacherCourses(supabase),
    getLessonById(supabase, lessonId),
  ]);
  const course = lesson ? courses.find((row) => row.id === lesson.course_id) : undefined;

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium text-ink-muted">Lessons / Duplicate</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold tracking-tight md:text-2xl">
              {course && lesson ? lesson.title : "Lesson"}
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {course
                ? `${course.class_name} · ${course.subject_name}`
                : "This lesson is not on a course assigned to you."}
            </p>
          </div>
          <Link href="/teacher/lessons" className={buttonSecondary}>
            All Lessons
          </Link>
        </div>
      </header>

      <div className="max-w-xl p-4 lg:p-8">
        {course && lesson ? (
          <section className={`${surfaceCard} p-6`}>
            <h2 className="text-lg font-semibold">Copy as a draft</h2>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              {lesson.title} is copied with its materials. Assessments stay on the original
              lesson. The copy starts as a draft.
            </p>
            <div className="mt-5">
              <DuplicateForm
                lessonId={lesson.id}
                courses={courses}
                defaultCourseId={lesson.course_id}
              />
            </div>
          </section>
        ) : (
          <p className="border border-line bg-surface px-4 py-6 text-sm">
            This lesson is not on a course assigned to you.
          </p>
        )}
      </div>
    </main>
  );
}
