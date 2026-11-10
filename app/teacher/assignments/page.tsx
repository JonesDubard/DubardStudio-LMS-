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
import { ASSESSMENT_TYPES, type AssessmentType } from "@/lib/types/assessments";

export const metadata: Metadata = {
  title: "Assignments",
};

const filters: { id: "all" | AssessmentType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "assignment", label: "Assignment" },
  { id: "quiz", label: "Quiz" },
  { id: "test", label: "Test" },
  { id: "exam", label: "Exam" },
];

function isFilter(value: string | undefined): value is "all" | AssessmentType {
  return value === "all" || ASSESSMENT_TYPES.some((type) => type === value);
}

export default async function TeacherAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const selected = isFilter(type) ? type : "all";
  const supabase = await createClient();
  const teacherId = await getSignedInTeacherId(supabase);
  const courses = await getTeacherCourses(supabase, teacherId);
  const grouped = await Promise.all(
    courses.map(async (course) => {
      const rows = await getTeacherAssessments(supabase, course.id);
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        type: row.type,
        className: course.class_name,
        subjectName: course.subject_name,
        status: row.status,
      }));
    }),
  );
  const assessments = grouped
    .flat()
    .filter((row) => selected === "all" || row.type === selected)
    .sort((left, right) => left.title.localeCompare(right.title));

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium text-ink-muted">Teacher</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          Assignments
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Assessments in the classes and subjects you teach.
        </p>
      </header>
      <div className="space-y-6 p-4 lg:p-8">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const href =
              filter.id === "all" ? "/teacher/assignments" : `/teacher/assignments?type=${filter.id}`;
            const active = filter.id === selected;
            return (
              <Link
                key={filter.id}
                href={href}
                className={
                  active
                    ? "rounded-lg bg-brand-subtle px-3 py-2 text-sm font-semibold text-brand-primary"
                    : "rounded-lg border border-line px-3 py-2 text-sm text-ink-secondary hover:bg-surface-muted"
                }
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
        {courses.length === 0 ? (
          <EmptyState icon={Inbox} title={NO_CLASSES_ASSIGNED_MESSAGE} />
        ) : assessments.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No assessments in this filter." />
        ) : (
          <DataTable
            columns={[
              { key: "title", header: "Assessment" },
              { key: "type", header: "Type" },
              { key: "class", header: "Class" },
              { key: "subject", header: "Subject" },
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
                assessment.type,
                assessment.className,
                assessment.subjectName,
                <StatusBadge key="status" label={assessment.status.toUpperCase()} />,
              ],
            }))}
          />
        )}
      </div>
    </main>
  );
}
