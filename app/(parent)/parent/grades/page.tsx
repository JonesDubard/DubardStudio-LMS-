import type { Metadata } from "next";
import { Award } from "lucide-react";
import { ChildSwitcher, NoLinkedChildren } from "@/components/parent/ChildSwitcher";
import { GradeCards } from "@/components/parent/ParentCards";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { getParentView } from "@/lib/queries/parent";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Parent Grades",
};

export default async function ParentGradesPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const { child } = await searchParams;
  const supabase = await createClient();
  const view = await getParentView(supabase, child);

  return (
    <>
      <PageHeader variant="section" eyebrow="Parent" title="Grades" />
      <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 md:px-8">
        {!view.selected ? (
          <NoLinkedChildren />
        ) : (
          <>
            <ChildSwitcher
              linked={view.children}
              selectedId={view.selected.id}
              basePath="/parent/grades"
            />
            {view.grades.length === 0 ? (
              <EmptyState icon={Award} title="No released grades yet." />
            ) : (
              <GradeCards items={view.grades} />
            )}
          </>
        )}
      </main>
    </>
  );
}
