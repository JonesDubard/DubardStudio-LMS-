import type { Metadata } from "next";
import { BulkImportPanel } from "@/components/admin/BulkImportPanel";
import { PeopleSubNav } from "@/components/admin/PeopleSubNav";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getStudents } from "@/lib/stubs/get-students";

export const metadata: Metadata = {
  title: "Manage Students",
};

export default function AdminStudentsPage() {
  const data = getStudents();

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">{data.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.title}</h1>
        <p className="mt-1 text-sm text-[#666666]">{data.subtitle}</p>
      </header>

      <div className="space-y-6 p-8">
        <PeopleSubNav />

        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-sm text-[#666666]">{data.countLabel}</p>
            <p className="mt-1 text-sm">{data.breakdownLabel}</p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="border border-[#999999] bg-white px-5 py-3"
            >
              {data.bulkImportButtonLabel}
            </button>
            <button
              type="button"
              className="border border-brand-primary bg-brand-primary px-5 py-3 text-white"
            >
              {data.inviteButtonLabel}
            </button>
          </div>
        </div>

        <DataTable
          columns={[
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "class", header: "Class" },
            { key: "status", header: "Status" },
            { key: "actions", header: "Actions" },
          ]}
          rows={data.students.map((student) => ({
            id: student.id,
            cells: [
              <span key="name" className="font-medium">
                {student.name}
              </span>,
              student.email,
              student.className,
              <StatusBadge key="status" label={student.status} />,
              <button
                key="action"
                type="button"
                className="border border-[#999999] px-3 py-2"
              >
                {student.actionLabel}
              </button>,
            ],
          }))}
        />

        <BulkImportPanel
          title={data.importTitle}
          description={data.importDescription}
          uploadTitle={data.uploadTitle}
          uploadDescription={data.uploadDescription}
          uploadButtonLabel={data.uploadButtonLabel}
          previewTitle={data.previewTitle}
          columns={data.csvColumns}
          rows={data.csvRows.map((row) => ({
            id: row.id,
            cells: [row.name, row.email, row.className],
          }))}
        />

        <div className="border border-[#999999] bg-white p-5">
          <p className="font-medium">{data.parentLinkTitle}</p>
          <p className="mt-1 text-sm text-[#666666]">
            {data.parentLinkDescription}
          </p>
        </div>
      </div>
    </main>
  );
}
