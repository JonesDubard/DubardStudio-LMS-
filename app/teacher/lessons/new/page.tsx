import type { Metadata } from "next";
import Link from "next/link";
import { LessonEditorForm } from "@/components/teacher/LessonEditorForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { buttonSecondary } from "@/lib/ui/styles";
import { getTeacherCourses } from "@/lib/queries/lessons";
import { NO_CLASSES_ASSIGNED_MESSAGE } from "@/lib/teacher/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create Lesson",
};

export default async function NewLessonPage() {
  const supabase = await createClient();
  const courses = await getTeacherCourses(supabase);

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium text-ink-muted">Lessons / Create Lesson</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold tracking-tight md:text-2xl">
              Create Lesson
            </h1>
            <p className="text-sm text-ink-secondary">
              Build a lesson for your selected class and subject.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/teacher/lessons" className={buttonSecondary}>
              All Lessons
            </Link>
            <StatusBadge label="DRAFT" />
          </div>
        </div>
      </header>

      <div className="max-w-5xl p-4 lg:p-8">
        {courses.length === 0 ? (
          <p className="border border-line bg-surface px-4 py-6 text-sm">
            {NO_CLASSES_ASSIGNED_MESSAGE}
          </p>
        ) : (
          <LessonEditorForm mode="create" courses={courses} />
        )}
      </div>
    </main>
  );
}
