import type { Metadata } from "next";
import { AcademicSubNav } from "@/components/admin/AcademicSubNav";
import {
  classNamesBySubjectId,
  getClasses,
  getClassSubjects,
  getSubjects,
} from "@/lib/queries/academic";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Subjects",
};

export default async function AcademicSubjectsPage() {
  const supabase = await createClient();
  const [classes, subjects] = await Promise.all([
    getClasses(supabase),
    getSubjects(supabase),
  ]);
  const linkGroups = await Promise.all(
    classes.map((row) => getClassSubjects(supabase, row.id)),
  );
  const classesBySubject = classNamesBySubjectId(classes, linkGroups.flat());

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">Academic / Setup</p>
        <h1 className="mt-1 text-2xl font-semibold">Subjects</h1>
        <p className="mt-1 text-sm text-[#666666]">
          Subjects available to classes.
        </p>
      </header>

      <div className="space-y-6 p-8">
        <AcademicSubNav />

        <div className="overflow-x-auto border border-[#999999] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#E5E5E5] text-left">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Classes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {subjects.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-[#666666]" colSpan={2}>
                    No subjects yet.
                  </td>
                </tr>
              ) : (
                subjects.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">
                      {classesBySubject.get(row.id)?.join(", ") || "—"}
                    </td>
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
