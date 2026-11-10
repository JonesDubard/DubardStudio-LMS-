import type { Metadata } from "next";
import { AcademicSubNav } from "@/components/admin/AcademicSubNav";
import { getAcademicYears, getTerms } from "@/lib/queries/academic";
import { createClient } from "@/lib/supabase/server";
import { TermsPanel } from "./_components/TermsPanel";

export const metadata: Metadata = {
  title: "Terms",
};

export default async function AcademicTermsPage() {
  const supabase = await createClient();
  const years = await getAcademicYears(supabase);
  const currentYear = years.find((year) => year.is_current) ?? null;
  const terms = currentYear ? await getTerms(supabase, currentYear.id) : [];

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-sm text-ink-secondary">Academic / Setup</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          Terms
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {currentYear
            ? `Terms within ${currentYear.name}.`
            : "Terms within the current year."}
        </p>
      </header>

      <div className="space-y-6 p-4 lg:p-8">
        <AcademicSubNav />

        <TermsPanel
          years={years.map((year) => ({
            id: year.id,
            name: year.name,
            start_date: year.start_date,
            end_date: year.end_date,
          }))}
          currentYear={
            currentYear
              ? {
                  id: currentYear.id,
                  name: currentYear.name,
                  start_date: currentYear.start_date,
                  end_date: currentYear.end_date,
                }
              : null
          }
          terms={terms}
        />
      </div>
    </main>
  );
}
