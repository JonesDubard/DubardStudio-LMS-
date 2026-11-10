import type { Metadata } from "next";
import Link from "next/link";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { listSchoolAssessments, listSchoolLessons } from "@/lib/queries/admin-content";
import { createClient } from "@/lib/supabase/server";
import { buttonSecondary } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Content",
};

function formatDue(value: string | null): string {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function AdminAssignmentsPage() {
  const supabase = await createClient();
  const [lessons, assessments] = await Promise.all([
    listSchoolLessons(supabase),
    listSchoolAssessments(supabase),
  ]);

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 md:px-8 md:py-6">
        <p className="text-xs font-medium text-ink-muted">Content</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          Lessons and assessments
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Read-only view of lessons and assessments in this school.
        </p>
      </header>

      <div className="space-y-8 p-4 md:p-8">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-ink">Lessons</h2>
          <DataTable
            columns={[
              { key: "title", header: "Lesson" },
              { key: "class", header: "Class" },
              { key: "subject", header: "Subject" },
              { key: "status", header: "Status" },
              { key: "actions", header: "Actions" },
            ]}
            rows={lessons.map((lesson) => ({
              id: lesson.id,
              cells: [
                <span key="title" className="font-medium">
                  {lesson.title}
                </span>,
                lesson.className,
                lesson.subjectName,
                <StatusBadge key="status" label={lesson.status.toUpperCase()} />,
                <Link key="view" href={`/admin/assignments/lessons/${lesson.id}`} className={buttonSecondary}>
                  View
                </Link>,
              ],
            }))}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-ink">Assessments</h2>
          <DataTable
            columns={[
              { key: "title", header: "Assessment" },
              { key: "type", header: "Type" },
              { key: "class", header: "Class" },
              { key: "due", header: "Due" },
              { key: "status", header: "Status" },
              { key: "actions", header: "Actions" },
            ]}
            rows={assessments.map((assessment) => ({
              id: assessment.id,
              cells: [
                <span key="title" className="font-medium">
                  {assessment.title}
                </span>,
                assessment.type,
                assessment.className,
                formatDue(assessment.dueDate),
                <StatusBadge key="status" label={assessment.status.toUpperCase()} />,
                <Link
                  key="view"
                  href={`/admin/assignments/assessments/${assessment.id}`}
                  className={buttonSecondary}
                >
                  View
                </Link>,
              ],
            }))}
          />
        </section>
      </div>
    </main>
  );
}
