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
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">Academic / Setup</p>
        <h1 className="mt-1 text-2xl font-semibold">Terms</h1>
        <p className="mt-1 text-sm text-[#666666]">
          {currentYear
            ? `Terms within ${currentYear.name}.`
            : "Terms within the current year."}
        </p>
      </header>

      <div className="space-y-6 p-8">
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
