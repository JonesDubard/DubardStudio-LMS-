import type { Metadata } from "next";
import Link from "next/link";
import { CreateAssessmentForm } from "@/components/teacher/CreateAssessmentForm";
import {
  getLessonById,
  getSignedInTeacherId,
  getTeacherCourses,
} from "@/lib/queries/lessons";
import { createClient } from "@/lib/supabase/server";
import { buttonSecondary, fieldLabel, surfaceCard } from "@/lib/ui/styles";

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
        <p className="text-xs font-medium text-ink-muted">Lessons / Assessment</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          Create Assessment
        </h1>
      </header>
      <div className="max-w-3xl space-y-6 p-4 lg:p-8">
        {!lesson || !course ? (
          <p className={`${surfaceCard} px-4 py-6 text-sm`}>
            This lesson is not available.
          </p>
        ) : (
          <>
            <section className={`${surfaceCard} p-5`}>
              <h2 className="text-lg font-semibold tracking-tight">Linked lesson</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <p className={fieldLabel}>Class</p>
                  <p className="text-sm font-medium">{course.class_name}</p>
                </div>
                <div>
                  <p className={fieldLabel}>Subject</p>
                  <p className="text-sm font-medium">{course.subject_name}</p>
                </div>
                <div>
                  <p className={fieldLabel}>Lesson</p>
                  <p className="break-words text-sm font-medium">{lesson.title}</p>
                </div>
              </div>
            </section>
            <CreateAssessmentForm lessonId={lesson.id} />
          </>
        )}
        <Link href={`/teacher/lessons/${lessonId}`} className={buttonSecondary}>
          Back to lesson
        </Link>
      </div>
    </main>
  );
}
