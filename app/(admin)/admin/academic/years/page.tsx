import type { Metadata } from "next";
import { AcademicSubNav } from "@/components/admin/AcademicSubNav";
import { getAcademicYears } from "@/lib/queries/academic";
import { createClient } from "@/lib/supabase/server";
import { YearsPanel } from "./_components/YearsPanel";

export const metadata: Metadata = {
  title: "Academic Years",
};

export default async function AcademicYearsPage() {
  const supabase = await createClient();
  const years = await getAcademicYears(supabase);

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-sm text-ink-secondary">Academic / Setup</p>
        <h1 className="mt-1 text-2xl font-semibold">Academic Years</h1>
        <p className="mt-1 text-sm text-ink-secondary">School academic years.</p>
      </header>

      <div className="space-y-6 p-4 lg:p-8">
        <AcademicSubNav />

        <YearsPanel years={years} />
      </div>
    </main>
  );
}
