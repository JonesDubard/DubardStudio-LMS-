import type { Metadata } from "next";
import { School } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { getStudentClasses } from "@/lib/queries/student";
import { createClient } from "@/lib/supabase/server";
import { surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Classes",
};

export default async function StudentClassesPage() {
  const supabase = await createClient();
  const classes = await getStudentClasses(supabase);

  return (
    <>
      <PageHeader variant="section" eyebrow="Student" title="Classes" />
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 md:px-8">
        {classes.length === 0 ? (
          <EmptyState icon={School} title="You are not enrolled in any classes yet." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {classes.map((item) => (
              <article key={item.id} className={`${surfaceCard} p-5`}>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Class
                </p>
                <h2 className="mt-1 break-words text-lg font-semibold tracking-tight text-ink">
                  {item.name}
                </h2>
                <p className="mt-2 text-sm text-ink-secondary">{item.yearName}</p>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
