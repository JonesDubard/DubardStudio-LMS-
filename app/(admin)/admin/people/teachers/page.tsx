import type { Metadata } from "next";
import { BulkImportPanel } from "@/components/admin/BulkImportPanel";
import { PeopleSubNav } from "@/components/admin/PeopleSubNav";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { surfaceCard } from "@/lib/ui/styles";
import { InviteTeacherForm } from "./InviteTeacherForm";

export const metadata: Metadata = {
  title: "Manage Teachers",
};

type MembershipRow = { profile_id: string; status: string };
type ProfileRow = { id: string; full_name: string | null; email: string };
type InvitationRow = { id: string; email: string | null; created_at: string };

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default async function AdminTeachersPage() {
  const supabase = await createClient();
  const membershipResult = await supabase
    .from("memberships")
    .select("profile_id, status")
    .eq("role", "teacher")
    .returns<MembershipRow[]>();
  if (membershipResult.error) {
    throw new Error(`memberships: ${membershipResult.error.message}`);
  }
  const memberships = membershipResult.data ?? [];

  const profileIds = [...new Set(memberships.map((row) => row.profile_id))];
  const profileResult =
    profileIds.length === 0
      ? { data: [] as ProfileRow[], error: null }
      : await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", profileIds)
          .returns<ProfileRow[]>();
  if (profileResult.error) throw new Error(`profiles: ${profileResult.error.message}`);
  const profileById = new Map((profileResult.data ?? []).map((row) => [row.id, row]));

  const invitationResult = await supabase
    .from("invitations")
    .select("id, email, created_at")
    .eq("role", "teacher")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<InvitationRow[]>();
  if (invitationResult.error) {
    throw new Error(`invitations: ${invitationResult.error.message}`);
  }
  const pending = invitationResult.data ?? [];

  const teachers = memberships
    .map((membership) => {
      const profile = profileById.get(membership.profile_id);
      return {
        id: membership.profile_id,
        name: profile?.full_name?.trim() || "Teacher",
        email: profile?.email ?? "",
        status: membership.status,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

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
              { key: "status", header: "Status" },
            ]}
            rows={teachers.map((teacher) => ({
              id: teacher.id,
              cells: [
                <span key="name" className="font-medium">
                  {teacher.name}
                </span>,
                teacher.email,
                <StatusBadge key="status" label={teacher.status.toUpperCase()} />,
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
              cells: [
                invite.email ?? "No email",
                <StatusBadge key="status" label="PENDING" />,
              ],
            }))}
          />
        </section>

        <BulkImportPanel
          title="Bulk Import Teachers"
          description="Upload a CSV containing teacher information."
          uploadTitle="Drop CSV file here"
          uploadDescription="or choose a file from your computer"
          uploadButtonLabel="Choose CSV File"
          previewTitle="CSV Column Preview"
          columns={[
            { key: "name", header: "name" },
            { key: "email", header: "email" },
            { key: "subjects", header: "subjects" },
          ]}
          rows={[
            {
              id: "preview",
              cells: ["Mrs. Abena Kollie", "abena.kollie@example.com", "Mathematics; English"],
            },
          ]}
        />
      </div>
    </main>
  );
}
