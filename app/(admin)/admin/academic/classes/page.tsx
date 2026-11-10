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
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-sm text-ink-secondary">Academic / Setup</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          Classes
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">Classes and grade levels.</p>
      </header>

      <div className="space-y-6 p-4 lg:p-8">
        <AcademicSubNav />

        <ClassesPanel classes={classes} />
      </div>
    </main>
  );
}
