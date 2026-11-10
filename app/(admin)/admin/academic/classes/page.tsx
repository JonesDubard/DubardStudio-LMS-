import type { Metadata } from "next";
import { AcademicSubNav } from "@/components/admin/AcademicSubNav";
import { getClasses, getSubjects } from "@/lib/queries/academic";
import { createClient } from "@/lib/supabase/server";
import { ClassesPanel } from "./_components/ClassesPanel";

export const metadata: Metadata = {
  title: "Classes",
};

export default async function AcademicClassesPage() {
  const supabase = await createClient();
  const [classes, subjects, linkResult, assignmentResult] = await Promise.all([
    getClasses(supabase),
    getSubjects(supabase),
    supabase
      .from("class_subjects")
      .select("id, class_id, subject_id")
      .returns<{ id: string; class_id: string; subject_id: string }[]>(),
    supabase
      .from("teacher_assignments")
      .select("teacher_id, class_subject_id")
      .returns<{ teacher_id: string; class_subject_id: string }[]>(),
  ]);
  if (linkResult.error) throw new Error(`class_subjects: ${linkResult.error.message}`);
  if (assignmentResult.error) {
    throw new Error(`teacher_assignments: ${assignmentResult.error.message}`);
  }
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
  const subjectName = new Map(subjects.map((row) => [row.id, row.name]));
  const linkById = new Map((linkResult.data ?? []).map((row) => [row.id, row]));
  const teachersByClass: Record<string, string[]> = {};
  for (const row of assignmentResult.data ?? []) {
    const link = linkById.get(row.class_subject_id);
    if (!link) continue;
    const label = `${teacherName.get(row.teacher_id) ?? "Teacher"} · ${subjectName.get(link.subject_id) ?? "Subject"}`;
    const list = teachersByClass[link.class_id] ?? [];
    list.push(label);
    teachersByClass[link.class_id] = list;
  }
  for (const labels of Object.values(teachersByClass)) {
    labels.sort((left, right) => left.localeCompare(right));
  }

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

        <ClassesPanel classes={classes} teachersByClass={teachersByClass} />
      </div>
    </main>
  );
}
