import type { Metadata } from "next";
import { AcademicSubNav } from "@/components/admin/AcademicSubNav";
import {
  getClasses,
  getClassSubjects,
  getSubjects,
} from "@/lib/queries/academic";
import { createClient } from "@/lib/supabase/server";
import { SubjectsPanel, type SubjectRow } from "./_components/SubjectsPanel";

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
  const classNameById = new Map(classes.map((row) => [row.id, row.name]));
  const linksBySubject = new Map<string, SubjectRow["links"]>();
  for (const link of linkGroups.flat()) {
    const className = classNameById.get(link.class_id);
    if (!className) continue;
    const rows = linksBySubject.get(link.subject_id) ?? [];
    rows.push({ id: link.id, className });
    linksBySubject.set(link.subject_id, rows);
  }
  const subjectRows: SubjectRow[] = subjects.map((row) => ({
    id: row.id,
    name: row.name,
    links: (linksBySubject.get(row.id) ?? []).sort((left, right) =>
      left.className.localeCompare(right.className),
    ),
  }));

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-sm text-ink-secondary">Academic / Setup</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          Subjects
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Subjects available to classes.
        </p>
      </header>

      <div className="space-y-6 p-4 lg:p-8">
        <AcademicSubNav />

        <SubjectsPanel
          subjects={subjectRows}
          classes={classes.map((row) => ({ id: row.id, name: row.name }))}
        />
      </div>
    </main>
  );
}
