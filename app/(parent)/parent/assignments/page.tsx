import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { ChildSwitcher, NoLinkedChildren } from "@/components/parent/ChildSwitcher";
import { AssignmentCards } from "@/components/parent/ParentCards";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { getParentView } from "@/lib/queries/parent";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Parent Assignments",
};

export default async function ParentAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const { child } = await searchParams;
  const supabase = await createClient();
  const view = await getParentView(supabase, child);

  return (
    <>
      <PageHeader variant="section" eyebrow="Parent" title="Assignments" />
      <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 md:px-8">
        {!view.selected ? (
          <NoLinkedChildren />
        ) : (
          <>
            <ChildSwitcher
              linked={view.children}
              selectedId={view.selected.id}
              basePath="/parent/assignments"
            />
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-ink">Upcoming</h2>
              {view.upcoming.length === 0 ? (
                <EmptyState icon={Inbox} title="No upcoming assignments." />
              ) : (
                <AssignmentCards items={view.upcoming} />
              )}
            </section>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-ink">Overdue</h2>
              {view.overdue.length === 0 ? (
                <EmptyState icon={Inbox} title="No overdue assignments." />
              ) : (
                <AssignmentCards items={view.overdue} />
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
