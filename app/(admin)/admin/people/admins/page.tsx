import type { Metadata } from "next";
import { PeopleSubNav } from "@/components/admin/PeopleSubNav";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getSchoolAdmins } from "@/lib/stubs/get-school-admins";

export const metadata: Metadata = {
  title: "School Admins",
};

export default function AdminAdminsPage() {
  const data = getSchoolAdmins();

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">{data.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.title}</h1>
        <p className="mt-1 text-sm text-[#666666]">{data.subtitle}</p>
      </header>

      <div className="space-y-6 p-8">
        <PeopleSubNav />

        <div className="flex justify-end">
          <button
            type="button"
            className="border border-[#333333] bg-[#333333] px-5 py-3 text-white"
          >
            {data.inviteButtonLabel}
          </button>
        </div>

        <DataTable
          columns={[
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "role", header: "Role" },
            { key: "status", header: "Status" },
            { key: "actions", header: "Actions" },
          ]}
          rows={data.admins.map((admin) => ({
            id: admin.id,
            cells: [
              <span key="name" className="font-medium">
                {admin.name}
              </span>,
              admin.email,
              admin.role,
              <StatusBadge key="status" label={admin.status} />,
              <button
                key="action"
                type="button"
                className="border border-[#999999] px-3 py-2"
              >
                {admin.actionLabel}
              </button>,
            ],
          }))}
        />

        <div className="max-w-2xl border border-[#999999] bg-white p-5">
          <p className="font-medium">{data.accessTitle}</p>
          <p className="mt-2 text-sm text-[#666666]">{data.accessDescription}</p>
        </div>
      </div>
    </main>
  );
}
