import type { Metadata } from "next";
import { DataTable } from "@/components/shared/DataTable";
import { FilterRow } from "@/components/shared/FilterRow";
import { getAdminAssignments } from "@/lib/stubs/get-admin-assignments";

export const metadata: Metadata = {
  title: "Assignments Overview",
};

export default function AdminAssignmentsPage() {
  const data = getAdminAssignments();

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 md:px-8 md:py-6">
        <p className="text-xs font-medium text-ink-muted">{data.eyebrow}</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          {data.title}
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">{data.subtitle}</p>
      </header>

      <div className="space-y-6 p-4 md:p-8">
        <FilterRow fields={data.filters} />

        <DataTable
          columns={[
            { key: "assignment", header: "Assignment" },
            { key: "teacher", header: "Teacher" },
            { key: "class", header: "Class" },
            { key: "due", header: "Due Date" },
            { key: "submissions", header: "Submissions" },
            { key: "graded", header: "Graded" },
            { key: "actions", header: "Actions" },
          ]}
          rows={data.assignments.map((assignment) => ({
            id: assignment.id,
            cells: [
              <span key="title" className="font-medium">
                {assignment.title}
              </span>,
              assignment.teacher,
              assignment.className,
              assignment.dueDate,
              assignment.submissions,
              assignment.graded,
              <button
                key="action"
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold tracking-tight text-ink shadow-card transition-colors duration-150 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assignment.actionLabel}
              </button>,
            ],
          }))}
        />
      </div>
    </main>
  );
}
