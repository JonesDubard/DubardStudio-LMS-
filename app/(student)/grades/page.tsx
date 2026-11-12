import type { Metadata } from "next";
import { Award } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { getStudentGradeGroups } from "@/lib/queries/student";
import { createClient } from "@/lib/supabase/server";
import { surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Grades",
};

export default async function StudentGradesPage() {
  const supabase = await createClient();
  const groups = await getStudentGradeGroups(supabase);

  return (
    <>
      <PageHeader variant="section" eyebrow="Student" title="Grades" />
      <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 md:px-8">
        {groups.length === 0 ? (
          <EmptyState icon={Award} title="No released grades yet." />
        ) : (
          groups.map((group) => (
            <section key={group.heading} className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-ink">{group.heading}</h2>
              <div className="grid grid-cols-1 gap-3">
                {group.grades.map((grade) => (
                  <article key={grade.id} className={`${surfaceCard} p-4 hover:shadow-lift`}>
                    <h3 className="break-words text-base font-semibold tracking-tight text-ink">
                      {grade.title}
                    </h3>
                    <p className="mt-2 text-lg font-semibold text-ink">{grade.scoreLabel}</p>
                    {grade.feedback ? (
                      <p className="mt-2 text-sm leading-6 text-ink-secondary">{grade.feedback}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </>
  );
}
