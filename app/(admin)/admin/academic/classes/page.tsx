import type { Metadata } from "next";
import { AcademicSubNav } from "@/components/admin/AcademicSubNav";
import { getClasses } from "@/lib/queries/academic";
import { createClient } from "@/lib/supabase/server";
import { ClassesPanel } from "./_components/ClassesPanel";

export const metadata: Metadata = {
  title: "Classes",
};

export default async function AcademicClassesPage() {
  const supabase = await createClient();
  const classes = await getClasses(supabase);

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">Academic / Setup</p>
        <h1 className="mt-1 text-2xl font-semibold">Classes</h1>
        <p className="mt-1 text-sm text-[#666666]">Classes and grade levels.</p>
      </header>

      <div className="space-y-6 p-8">
        <AcademicSubNav />

        <ClassesPanel classes={classes} />
      </div>
    </main>
  );
}
