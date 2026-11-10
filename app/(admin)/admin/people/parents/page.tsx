import type { Metadata } from "next";
import Link from "next/link";
import { InvitePersonForm } from "@/components/admin/InvitePersonForm";
import { ParentChildLinkPanel } from "@/components/admin/ParentChildLinkPanel";
import { PendingInvites } from "@/components/admin/PendingInvites";
import { PeopleSubNav } from "@/components/admin/PeopleSubNav";
import { listPeople } from "@/lib/queries/people";
import { createClient } from "@/lib/supabase/server";
import { surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Parent-Child Linking",
};

export default async function AdminParentsPage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string }>;
}) {
  const { parent: requestedId } = await searchParams;
  const supabase = await createClient();
  const [parents, students] = await Promise.all([
    listPeople(supabase, "parent", "Parent"),
    listPeople(supabase, "student", "Student"),
  ]);
  const selected = parents.find((row) => row.id === requestedId) ?? parents[0] ?? null;

  let linked: { id: string; name: string }[] = [];
  if (selected) {
    const linkResult = await supabase
      .from("parent_children")
      .select("student_id")
      .eq("parent_id", selected.id)
      .returns<{ student_id: string }[]>();
    if (linkResult.error) throw new Error(`parent_children: ${linkResult.error.message}`);
    const names = new Map(students.map((student) => [student.id, student.name]));
    linked = (linkResult.data ?? []).map((row) => ({
      id: row.student_id,
      name: names.get(row.student_id) ?? "Student",
    }));
  }

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 md:px-8 md:py-6">
        <p className="text-xs font-medium text-ink-muted">People / Parents</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          Parent-Child Linking
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Select a parent and link them to one or more students.
        </p>
      </header>

      <div className="space-y-6 p-4 md:p-8">
        <PeopleSubNav />

        <section className={`${surfaceCard} p-5`}>
          <h2 className="text-lg font-semibold">Invite a parent</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Saves a pending invitation. No email is sent.
          </p>
          <div className="mt-4">
            <InvitePersonForm role="parent" />
          </div>
        </section>

        <PendingInvites role="parent" />

        <div className="grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section className="rounded-lg border border-line bg-surface shadow-card">
            <div className="border-b border-line p-5">
              <h2 className="font-semibold">Parents</h2>
              <p className="mt-1 text-sm text-ink-secondary">Select a parent.</p>
            </div>
            <div className="divide-y divide-line">
              {parents.length === 0 ? (
                <p className="p-5 text-sm text-ink-secondary">No parents yet.</p>
              ) : (
                parents.map((parent) => {
                  const active = parent.id === selected?.id;
                  return (
                    <Link
                      key={parent.id}
                      href={`/admin/people/parents?parent=${parent.id}`}
                      className={
                        active
                          ? "block border-l-4 border-brand-primary bg-brand-subtle p-5"
                          : "block p-5 hover:bg-surface-muted"
                      }
                    >
                      <p className={active ? "font-semibold" : "font-medium"}>{parent.name}</p>
                      <p className="mt-1 text-sm text-ink-secondary">{parent.email}</p>
                    </Link>
                  );
                })
              )}
            </div>
          </section>

          <ParentChildLinkPanel
            parentId={selected?.id ?? null}
            parentName={selected?.name ?? "No parent selected"}
            parentEmail={selected?.email ?? ""}
            linkedChildren={linked}
            students={students.map((student) => ({
              id: student.id,
              name: student.name,
              email: student.email,
            }))}
          />
        </div>
      </div>
    </main>
  );
}
