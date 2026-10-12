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
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">Academic / Setup</p>
        <h1 className="mt-1 text-2xl font-semibold">Academic Years</h1>
        <p className="mt-1 text-sm text-[#666666]">School academic years.</p>
      </header>

      <div className="space-y-6 p-8">
        <AcademicSubNav />

        <YearsPanel years={years} />
      </div>
    </main>
  );
}
