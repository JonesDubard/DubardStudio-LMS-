import type { Metadata } from "next";
import { GradeEntryTable } from "@/components/teacher/GradeEntryTable";
import { getGradeEntryRoster } from "@/lib/stubs/get-grade-entry-roster";

export const metadata: Metadata = {
  title: "Grade Entry",
};

type GradeEntryPageProps = {
  params: Promise<{ assessmentId: string }>;
};

export default async function GradeEntryPage({ params }: GradeEntryPageProps) {
  const { assessmentId } = await params;
  const roster = getGradeEntryRoster(assessmentId);

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 md:px-8 md:py-6">
        <p className="text-sm text-ink-secondary">{roster.eyebrow}</p>

        <div className="mt-1 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">{roster.title}</h1>
            <p className="mt-1 text-sm text-ink-secondary">{roster.classLabel}</p>
          </div>

          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-ink-secondary">Assessment Type</p>
              <p className="font-medium">{roster.typeLabel}</p>
            </div>
            <div>
              <p className="text-ink-secondary">Max Score</p>
              <p className="font-medium">{roster.maxScoreLabel}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8">
        <GradeEntryTable
          maxScore={roster.assessment.maxScore ?? 20}
          studentCountLabel={roster.studentCountLabel}
          lastSavedLabel={roster.lastSavedLabel}
          lastSavedAt={roster.lastSavedAt}
          rows={roster.rows}
        />
      </div>
    </main>
  );
}
