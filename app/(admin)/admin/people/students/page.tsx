import type { Metadata } from "next";
import { AssignPersonButton } from "@/components/admin/AssignPersonButton";
import { BulkImportDialog } from "@/components/admin/BulkImportDialog";
import { InvitePersonForm } from "@/components/admin/InvitePersonForm";
import { PendingInvites } from "@/components/admin/PendingInvites";
import { PeopleSubNav } from "@/components/admin/PeopleSubNav";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { assignStudentClass } from "@/app/(admin)/admin/people/actions";
import { classDisplayName } from "@/lib/academic/labels";
import { getClasses } from "@/lib/queries/academic";
import { listPeople } from "@/lib/queries/people";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Manage Students",
};

export default async function AdminStudentsPage() {
  const supabase = await createClient();
  const [students, classes, yearResult] = await Promise.all([
    listPeople(supabase, "student", "Student"),
    getClasses(supabase),
    supabase
      .from("academic_years")
      .select("id")
      .eq("is_current", true)
      .maybeSingle<{ id: string }>(),
  ]);
  if (yearResult.error) throw new Error(`academic_years: ${yearResult.error.message}`);

  const classNames = classes.map((row) => row.name);
  const className = new Map(
    classes.map((row) => [row.id, classDisplayName(row.name, row.id, classNames)]),
  );
  const classByStudent = new Map<string, string>();
  if (yearResult.data) {
    const enrollmentResult = await supabase
      .from("enrollments")
      .select("student_id, class_id")
      .eq("academic_year_id", yearResult.data.id)
      .eq("status", "active")
      .returns<{ student_id: string; class_id: string }[]>();
    if (enrollmentResult.error) {
      throw new Error(`enrollments: ${enrollmentResult.error.message}`);
    }
    for (const row of enrollmentResult.data ?? []) {
      const name = className.get(row.class_id);
      if (!name) continue;
      const current = classByStudent.get(row.student_id);
      classByStudent.set(row.student_id, current ? `${current}, ${name}` : name);
    }
  }

  const options = classes.map((row) => ({
    id: row.id,
    label: className.get(row.id) ?? row.name,
  }));
  const blockedMessage = yearResult.data
    ? options.length === 0
      ? "Add a class under Academic before assigning one."
      : null
    : "Set a current academic year under Academic before assigning a class.";

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium text-ink-muted">People / Students</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          Students
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Manage student invitations and class assignments.
        </p>
      </header>

      <div className="space-y-6 p-4 lg:p-8">
        <PeopleSubNav />

        <section className="rounded-lg border border-line bg-surface p-5 shadow-card">
          <h2 className="text-lg font-semibold">Invite a student</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Saves a pending invitation. No email is sent.
          </p>
          <div className="mt-4">
            <InvitePersonForm role="student" />
          </div>
        </section>

        <PendingInvites role="student" />

        <div className="flex flex-wrap justify-between gap-4">
          <p className="text-sm text-ink-secondary">
            {students.length} {students.length === 1 ? "student" : "students"}
          </p>
          <BulkImportDialog role="student" />
        </div>

        <DataTable
          columns={[
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "class", header: "Class" },
            { key: "status", header: "Status" },
            { key: "actions", header: "Actions" },
          ]}
          rows={students.map((student) => ({
            id: student.id,
            cells: [
              <span key="name" className="font-medium">
                {student.name}
              </span>,
              student.email,
              classByStudent.get(student.id) ?? "Not assigned",
              <StatusBadge key="status" label={student.status.toUpperCase()} />,
              <AssignPersonButton
                key="action"
                personId={student.id}
                personName={student.name}
                options={options}
                fieldName="Class"
                blockedMessage={blockedMessage}
                assign={assignStudentClass}
              />,
            ],
          }))}
        />

        <div className="border border-line bg-surface p-5">
          <p className="font-medium">Parent Linking</p>
          <p className="mt-1 text-sm text-ink-secondary">
            After students are added, use People → Parents to invite parents and link them to one
            or more students.
          </p>
        </div>
      </div>
    </main>
  );
}
