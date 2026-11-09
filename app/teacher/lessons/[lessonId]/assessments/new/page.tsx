import type { Metadata } from "next";
import Link from "next/link";
import { CreateAssessmentForm } from "@/components/teacher/CreateAssessmentForm";
import {
  getLessonById,
  getSignedInTeacherId,
  getTeacherCourses,
} from "@/lib/queries/lessons";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create Assessment",
};

export default async function NewAssessmentPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
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
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-sm text-ink-secondary">Lessons / Assessment</p>
        <h1 className="mt-1 text-2xl font-semibold">Create Assessment</h1>
      </header>
      <div className="max-w-3xl space-y-6 p-4 lg:p-8">
        {!lesson || !course ? (
          <p className="border border-line bg-surface px-4 py-6 text-sm">
            This lesson is not available.
          </p>
        ) : (
          <>
            <section className="border border-line bg-surface p-6">
              <h2 className="text-lg font-semibold">Linked lesson</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="border border-line p-4">
                  <p className="text-xs text-ink-secondary">Class</p>
                  <p className="mt-1 font-medium">{course.class_name}</p>
                </div>
                <div className="border border-line p-4">
                  <p className="text-xs text-ink-secondary">Subject</p>
                  <p className="mt-1 font-medium">{course.subject_name}</p>
                </div>
                <div className="border border-line p-4">
                  <p className="text-xs text-ink-secondary">Lesson</p>
                  <p className="mt-1 font-medium">{lesson.title}</p>
                </div>
              </div>
            </section>
            <CreateAssessmentForm lessonId={lesson.id} />
          </>
        )}
        <Link href={`/teacher/lessons/${lessonId}`} className="inline-block text-sm underline">
          Back to lesson
        </Link>
      </div>
    </main>
  );
}
