import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Inbox } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getTeacherAssessments } from "@/lib/queries/assessments";
import { getSignedInTeacherId, getTeacherCourses } from "@/lib/queries/lessons";
import { NO_CLASSES_ASSIGNED_MESSAGE } from "@/lib/teacher/assignment-stub";
import { createClient } from "@/lib/supabase/server";
import type { AssessmentStatus } from "@/lib/types/assessments";

export const metadata: Metadata = {
  title: "Grading",
};

function statusLabel(status: AssessmentStatus): string {
  if (status === "published") return "PUBLISHED";
  if (status === "archived") return "ARCHIVED";
  return "DRAFT";
}

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

export default async function TeacherGradingPage() {
  const supabase = await createClient();
  const teacherId = await getSignedInTeacherId(supabase);
  const courses = await getTeacherCourses(supabase, teacherId);
  const grouped = await Promise.all(
    courses.map(async (course) => {
      const rows = await getTeacherAssessments(supabase, course.id);
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        className: course.class_name,
        subjectName: course.subject_name,
        status: row.status,
        dueDate: row.dueDate,
      }));
    }),
  );
  const assessments = grouped.flat();

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium text-ink-muted">Teacher</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          Grading
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Open an assessment to review submissions and release grades.
        </p>
      </header>
      <div className="p-4 lg:p-8">
        {courses.length === 0 ? (
          <EmptyState icon={Inbox} title={NO_CLASSES_ASSIGNED_MESSAGE} />
        ) : assessments.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No assessments yet." />
        ) : (
          <DataTable
            columns={[
              { key: "title", header: "Assessment" },
              { key: "class", header: "Class" },
              { key: "subject", header: "Subject" },
              { key: "due", header: "Due" },
              { key: "status", header: "Status" },
            ]}
            rows={assessments.map((assessment) => ({
              id: assessment.id,
              cells: [
                <Link
                  key="title"
                  href={`/teacher/assessments/${assessment.id}/submissions`}
                  className="font-medium text-ink underline-offset-2 hover:underline"
                >
                  {assessment.title}
                </Link>,
                assessment.className,
                assessment.subjectName,
                formatDue(assessment.dueDate),
                <StatusBadge key="status" label={statusLabel(assessment.status)} />,
              ],
            }))}
          />
        )}
      </div>
    </main>
  );
}
