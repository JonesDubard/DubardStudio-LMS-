import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { AddToClassModal } from "@/components/teacher/AddToClassModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  getSignedInTeacherId,
  getTeacherCourses,
  getTeacherLessons,
} from "@/lib/queries/lessons";
import { createClient } from "@/lib/supabase/server";
import { surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "My Reusable Library",
};

export default async function TeacherLibraryPage() {
  const supabase = await createClient();
  const teacherId = await getSignedInTeacherId(supabase);
  const [courses, lessons] = await Promise.all([
    getTeacherCourses(supabase),
    getTeacherLessons(supabase, { teacherId, isReusable: true }),
  ]);

  return (
    <>
      <PageHeader variant="section" eyebrow="Teacher" title="My Library" />
      <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
          Reusable lessons you have saved for copying into another class.
        </p>

        {lessons.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Your reusable library is empty."
            description="Save a lesson to your Reusable Library from the lesson editor."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {lessons.map((lesson) => (
              <article
                key={lesson.id}
                className={`${surfaceCard} group flex min-h-64 flex-col rounded-2xl p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-brand-border hover:shadow-lift`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-brand-primary">
                    <BookOpen size={20} strokeWidth={1.8} aria-hidden />
                  </span>
                  <StatusBadge label="REUSABLE" tone="ready" />
                </div>
                <div className="mt-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex max-w-full items-center rounded-full border border-brand-border bg-brand-subtle px-2.5 py-1 text-[11px] font-semibold tracking-wide text-brand-primary">
                      {lesson.subject_name}
                    </span>
                    <span className="inline-flex max-w-full items-center rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-ink-secondary">
                      {lesson.class_name}
                    </span>
                  </div>
                  <h2 className="break-words text-base font-semibold tracking-tight text-ink sm:text-lg">
                    {lesson.title}
                  </h2>
                  <p className="mt-1 text-sm text-ink-secondary">
                    {lesson.course_name ?? "Course"}
                  </p>
                </div>
                <div className="mt-auto border-t border-line pt-4">
                  <div className="w-full [&>button]:w-full">
                    <AddToClassModal
                      lessonId={lesson.id}
                      lessonTitle={lesson.title}
                      courses={courses}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
