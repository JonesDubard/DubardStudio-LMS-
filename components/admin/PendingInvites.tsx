import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { createClient } from "@/lib/supabase/server";

type InviteRole = "teacher" | "student" | "school_admin" | "parent";

export async function PendingInvites({ role }: { role: InviteRole }) {
  const supabase = await createClient();
  const result = await supabase
    .from("invitations")
    .select("id, email, created_at")
    .eq("role", role)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<{ id: string; email: string | null; created_at: string }[]>();
  if (result.error) throw new Error(`invitations: ${result.error.message}`);
  const pending = result.data ?? [];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-ink">Pending invitations</h2>
      {pending.length === 0 ? (
        <p className="text-sm text-ink-secondary">No pending invitations.</p>
      ) : (
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
      )}
    </section>
  );
}
