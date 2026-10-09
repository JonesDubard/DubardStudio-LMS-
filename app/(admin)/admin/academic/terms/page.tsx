import type { Metadata } from "next";
import { AcademicSubNav } from "@/components/admin/AcademicSubNav";
import { getAcademicYears, getTerms, termStatus } from "@/lib/queries/academic";
import { createClient } from "@/lib/supabase/server";

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

        <div className="overflow-x-auto border border-[#999999] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#E5E5E5] text-left">
              <tr>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">End</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {terms.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-[#666666]" colSpan={4}>
                    {currentYear
                      ? "No terms for the current academic year."
                      : "No current academic year."}
                  </td>
                </tr>
              ) : (
                terms.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">{row.start_date}</td>
                    <td className="px-4 py-3">{row.end_date}</td>
                    <td className="px-4 py-3">{termStatus(row)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
