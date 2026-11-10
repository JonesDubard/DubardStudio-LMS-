import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { ClassCard } from "@/components/teacher/ClassCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { getTeacherCourses } from "@/lib/queries/lessons";
import { NO_CLASSES_ASSIGNED_MESSAGE } from "@/lib/teacher/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Classes",
};

export default async function TeacherClassesPage() {
  const supabase = await createClient();
  const courses = await getTeacherCourses(supabase);

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium text-ink-muted">Teacher</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          Classes
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Classes and subjects assigned to you.
        </p>
      </header>
      <div className="p-4 lg:p-8">
        {courses.length === 0 ? (
          <EmptyState icon={Inbox} title={NO_CLASSES_ASSIGNED_MESSAGE} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <ClassCard
                key={course.id}
                name={course.class_name}
                subject={course.subject_name}
                studentCountLabel={course.term_name}
                href={`/teacher/lessons?class=${course.class_id}`}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
