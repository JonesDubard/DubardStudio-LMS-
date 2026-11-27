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
  const [classes, linkResult, assignmentResult] =
    await Promise.all([
      getClasses(supabase),
      supabase
        .from("class_subjects")
        .select("id, class_id")
        .returns<{ id: string; class_id: string }[]>(),
      supabase
        .from("teacher_assignments")
        .select("teacher_id, class_subject_id")
        .returns<{ teacher_id: string; class_subject_id: string }[]>(),
    ]);
  if (linkResult.error) throw new Error(`class_subjects: ${linkResult.error.message}`);
  if (assignmentResult.error) {
    throw new Error(`teacher_assignments: ${assignmentResult.error.message}`);
  }
  const studentCountEntries = await Promise.all(
    classes.map(async (row) => {
      const result = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("class_id", row.id);
      if (result.error) throw new Error(`enrollments: ${result.error.message}`);
      return [row.id, result.count ?? 0] as const;
    }),
  );
  const studentCountByClass = Object.fromEntries(studentCountEntries);
  const teacherIds = [...new Set((assignmentResult.data ?? []).map((row) => row.teacher_id))];
  const profileResult =
    teacherIds.length === 0
      ? { data: [] as { id: string; full_name: string | null }[], error: null }
      : await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", teacherIds)
          .returns<{ id: string; full_name: string | null }[]>();
  if (profileResult.error) throw new Error(`profiles: ${profileResult.error.message}`);
  const teacherName = new Map(
    (profileResult.data ?? []).map((row) => [row.id, row.full_name?.trim() || "Teacher"]),
  );
  const linkById = new Map((linkResult.data ?? []).map((row) => [row.id, row]));
  const teacherIdsByClass: Record<string, Set<string>> = {};
  for (const row of assignmentResult.data ?? []) {
    const link = linkById.get(row.class_subject_id);
    if (!link) continue;
    const ids = teacherIdsByClass[link.class_id] ?? new Set<string>();
    ids.add(row.teacher_id);
    teacherIdsByClass[link.class_id] = ids;
  }
  const teachersByClass = Object.fromEntries(
    Object.entries(teacherIdsByClass).map(([classId, ids]) => [
      classId,
      [...ids]
        .map((id) => teacherName.get(id) ?? "Teacher")
        .sort((left, right) => left.localeCompare(right)),
    ]),
  );

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-sm text-ink-secondary">Academic / Setup</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          Classes
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">Classes</p>
      </header>

      <div className="space-y-6 p-4 lg:p-8">
        <AcademicSubNav />

        <ClassesPanel
          classes={classes}
          teachersByClass={teachersByClass}
          studentCountByClass={studentCountByClass}
        />
      </div>
    </main>
  );
}
