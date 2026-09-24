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
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">{data.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.title}</h1>
        <p className="mt-1 text-sm text-[#666666]">{data.subtitle}</p>
      </header>

      <div className="space-y-6 p-8">
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
                className="border border-[#999999] px-3 py-2"
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
