import type { Metadata } from "next";
import { AcademicSubNav } from "@/components/admin/AcademicSubNav";
import { academicYearStatus, getAcademicYears } from "@/lib/queries/academic";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Academic Years",
};

export default async function AcademicYearsPage() {
  const supabase = await createClient();
  const years = await getAcademicYears(supabase);

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">Academic / Setup</p>
        <h1 className="mt-1 text-2xl font-semibold">Academic Years</h1>
        <p className="mt-1 text-sm text-[#666666]">School academic years.</p>
      </header>

      <div className="space-y-6 p-8">
        <AcademicSubNav />

        <div className="overflow-x-auto border border-[#999999] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#E5E5E5] text-left">
              <tr>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">End</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {years.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-[#666666]" colSpan={4}>
                    No academic years yet.
                  </td>
                </tr>
              ) : (
                years.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">{row.start_date}</td>
                    <td className="px-4 py-3">{row.end_date}</td>
                    <td className="px-4 py-3">{academicYearStatus(row)}</td>
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
