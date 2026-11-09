import type { Metadata } from "next";
import { PeopleSubNav } from "@/components/admin/PeopleSubNav";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getSchoolAdmins } from "@/lib/stubs/get-school-admins";
import { buttonPrimary, buttonSecondary, surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "School Admins",
};

export default function AdminAdminsPage() {
  const data = getSchoolAdmins();

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-sm text-ink-secondary">{data.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.title}</h1>
        <p className="mt-1 text-sm text-ink-secondary">{data.subtitle}</p>
      </header>

      <div className="space-y-6 p-4 lg:p-8">
        <PeopleSubNav />

        <div className="flex justify-end">
          <button type="button" className={buttonPrimary}>
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
                className={buttonSecondary}
              >
                {admin.actionLabel}
              </button>,
            ],
          }))}
        />

        <div className={`${surfaceCard} max-w-2xl p-5`}>
          <p className="font-medium">{data.accessTitle}</p>
          <p className="mt-2 text-sm text-ink-secondary">{data.accessDescription}</p>
        </div>
      </div>
    </main>
  );
}
