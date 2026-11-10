import type { Metadata } from "next";
import { AssignPersonButton } from "@/components/admin/AssignPersonButton";
import { BulkImportDialog } from "@/components/admin/BulkImportDialog";
import { PeopleSubNav } from "@/components/admin/PeopleSubNav";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { assignTeacherClass } from "@/app/(admin)/admin/people/actions";
import { classDisplayName } from "@/lib/academic/labels";
import { getClasses, getSubjects } from "@/lib/queries/academic";
import { listPeople } from "@/lib/queries/people";
import { createClient } from "@/lib/supabase/server";
import { surfaceCard } from "@/lib/ui/styles";
import { InviteTeacherForm } from "./InviteTeacherForm";

export const metadata: Metadata = {
  title: "Manage Teachers",
};

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default async function AdminTeachersPage() {
  const supabase = await createClient();
  const [teachers, classes, subjects, linkResult, assignmentResult, invitationResult] =
    await Promise.all([
      listPeople(supabase, "teacher", "Teacher"),
      getClasses(supabase),
      getSubjects(supabase),
      supabase
        .from("class_subjects")
        .select("id, class_id, subject_id")
        .returns<{ id: string; class_id: string; subject_id: string }[]>(),
      supabase
        .from("teacher_assignments")
        .select("teacher_id, class_subject_id")
        .returns<{ teacher_id: string; class_subject_id: string }[]>(),
      supabase
        .from("invitations")
        .select("id, email, created_at")
        .eq("role", "teacher")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .returns<{ id: string; email: string | null; created_at: string }[]>(),
    ]);
  if (linkResult.error) throw new Error(`class_subjects: ${linkResult.error.message}`);
  if (assignmentResult.error) {
    throw new Error(`teacher_assignments: ${assignmentResult.error.message}`);
  }
  if (invitationResult.error) throw new Error(`invitations: ${invitationResult.error.message}`);

  const classNames = classes.map((row) => row.name);
  const className = new Map(
    classes.map((row) => [row.id, classDisplayName(row.name, row.id, classNames)]),
  );
  const subjectName = new Map(subjects.map((row) => [row.id, row.name]));
  const linkLabel = new Map(
    (linkResult.data ?? []).map((row) => [
      row.id,
      `${className.get(row.class_id) ?? "Class"} · ${subjectName.get(row.subject_id) ?? "Subject"}`,
    ]),
  );
  const options = [...linkLabel.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const assignmentsByTeacher = new Map<string, string[]>();
  for (const row of assignmentResult.data ?? []) {
    const label = linkLabel.get(row.class_subject_id);
    if (!label) continue;
    const list = assignmentsByTeacher.get(row.teacher_id) ?? [];
    list.push(label);
    assignmentsByTeacher.set(row.teacher_id, list);
  }
  const pending = invitationResult.data ?? [];
  const blockedMessage =
    options.length === 0
      ? "Link a subject to a class under Academic before assigning a teacher."
      : null;

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium text-ink-muted">People / Teachers</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          Teachers
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Manage teacher invitations and class assignments.
        </p>
      </header>

      <div className="space-y-6 p-4 lg:p-8">
        <PeopleSubNav />

        <div>
          <p className="text-sm text-ink-secondary">
            {countLabel(teachers.length, "teacher", "teachers")} ·{" "}
            {countLabel(pending.length, "pending invite", "pending invites")}
          </p>
        </div>

        <section className={`${surfaceCard} p-5`}>
          <h2 className="text-lg font-semibold">Invite a teacher</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Saves a pending invitation. No email is sent.
          </p>
          <div className="mt-4">
            <InviteTeacherForm />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-ink">Active teachers</h2>
          <DataTable
            columns={[
              { key: "name", header: "Name" },
              { key: "email", header: "Email" },
              { key: "classes", header: "Classes" },
              { key: "status", header: "Status" },
              { key: "actions", header: "Actions" },
            ]}
            rows={teachers.map((teacher) => ({
              id: teacher.id,
              cells: [
                <span key="name" className="font-medium">
                  {teacher.name}
                </span>,
                teacher.email,
                (assignmentsByTeacher.get(teacher.id) ?? []).sort().join(", ") || "Not assigned",
                <StatusBadge key="status" label={teacher.status.toUpperCase()} />,
                <AssignPersonButton
                  key="action"
                  personId={teacher.id}
                  personName={teacher.name}
                  options={options}
                  fieldName="Class and subject"
                  blockedMessage={blockedMessage}
                  assign={assignTeacherClass}
                />,
              ],
            }))}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-ink">Pending invitations</h2>
          <DataTable
            columns={[
              { key: "email", header: "Email" },
              { key: "status", header: "Status" },
            ]}
            rows={pending.map((invite) => ({
              id: invite.id,
              cells: [invite.email ?? "No email", <StatusBadge key="status" label="PENDING" />],
            }))}
          />
        </section>

        <div className="flex justify-end">
          <BulkImportDialog role="teacher" />
        </div>
      </div>
    </main>
  );
}
