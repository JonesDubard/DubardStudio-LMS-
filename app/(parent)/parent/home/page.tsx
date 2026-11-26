import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { ChildSwitcher, NoLinkedChildren } from "@/components/parent/ChildSwitcher";
import { AssignmentCards, GradeCards } from "@/components/parent/ParentCards";
import { AnnouncementCard } from "@/components/shared/AnnouncementCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { previewAnnouncements } from "@/lib/announcements/preview";
import { getParentView } from "@/lib/queries/parent";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Parent Home",
};

export default async function ParentHomePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const { child } = await searchParams;
  const supabase = await createClient();
  const view = await getParentView(supabase, child);

  return (
    <>
      <PageHeader variant="greeting" eyebrow="Parent Home" title={view.greeting} />
      <main className="space-y-8 px-4 py-6 md:px-8">
        {!view.selected ? (
          <NoLinkedChildren />
        ) : (
          <>
            <ChildSwitcher
              linked={view.children}
              selectedId={view.selected.id}
              basePath="/parent/home"
            />
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-ink">
                  Notices &amp; Due Dates
                </h2>
                <p className="mt-1 text-[10px] text-ink-muted">Sample notices</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {previewAnnouncements.slice(0, 3).map((announcement) => (
                  <AnnouncementCard
                    key={announcement.category}
                    {...announcement}
                  />
                ))}
              </div>
            </section>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-ink">Upcoming</h2>
              {view.upcoming.length === 0 ? (
                <EmptyState icon={Inbox} title="No upcoming assignments." />
              ) : (
                <AssignmentCards items={view.upcoming.slice(0, 3)} />
              )}
            </section>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-ink">Overdue</h2>
              {view.overdue.length === 0 ? (
                <EmptyState icon={Inbox} title="No overdue assignments." />
              ) : (
                <AssignmentCards items={view.overdue.slice(0, 3)} />
              )}
            </section>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-ink">Recent grades</h2>
              {view.grades.length === 0 ? (
                <EmptyState icon={Inbox} title="No released grades yet." />
              ) : (
                <GradeCards items={view.grades.slice(0, 3)} />
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
