import type { Metadata } from "next";
import { InvitePersonForm } from "@/components/admin/InvitePersonForm";
import { PendingInvites } from "@/components/admin/PendingInvites";
import { PeopleSubNav } from "@/components/admin/PeopleSubNav";
import { RemoveAdminButton } from "@/components/admin/RemoveAdminButton";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { listPeople } from "@/lib/queries/people";
import { createClient } from "@/lib/supabase/server";
import { surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "School Admins",
};

export default async function AdminAdminsPage() {
  const supabase = await createClient();
  const admins = await listPeople(supabase, "school_admin", "School admin");

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium text-ink-muted">People / School Admins</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          School Admins
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Manage administrators who can manage this school.
        </p>
      </header>

      <div className="space-y-6 p-4 lg:p-8">
        <PeopleSubNav />

        <section className={`${surfaceCard} p-5`}>
          <h2 className="text-lg font-semibold">Invite a school admin</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Saves a pending invitation. No email is sent.
          </p>
          <div className="mt-4">
            <InvitePersonForm role="school_admin" />
          </div>
        </section>

        <PendingInvites role="school_admin" />

        <DataTable
          columns={[
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "status", header: "Status" },
            { key: "actions", header: "Actions" },
          ]}
          rows={admins.map((admin) => ({
            id: admin.id,
            cells: [
              <span key="name" className="font-medium">
                {admin.name}
              </span>,
              admin.email,
              <StatusBadge key="status" label={admin.status.toUpperCase()} />,
              <RemoveAdminButton key="action" profileId={admin.id} name={admin.name} />,
            ],
          }))}
        />

        <div className={`${surfaceCard} max-w-2xl p-5`}>
          <p className="font-medium">School Admin Access</p>
          <p className="mt-2 text-sm text-ink-secondary">
            A school can have multiple admins. Any admin can invite another. The last active
            admin cannot be removed.
          </p>
        </div>
      </div>
    </main>
  );
}
