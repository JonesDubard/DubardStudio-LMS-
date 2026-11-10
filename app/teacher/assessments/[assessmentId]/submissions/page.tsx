import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GradeRosterForm } from "@/components/teacher/GradeRosterForm";
import { SubmissionGrader } from "@/components/teacher/SubmissionGrader";
import {
  getAssessmentDetails,
  getRosterForGradeEntry,
  getSubmissionsForAssessment,
} from "@/lib/queries/assessments";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Grade Assessment",
};

export default async function AssessmentSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ assessmentId: string }>;
  searchParams: Promise<{ submission?: string }>;
}) {
  const { assessmentId } = await params;
  const { submission: selectedId } = await searchParams;
  const supabase = await createClient();
  const assessment = await getAssessmentDetails(supabase, assessmentId);
  if (!assessment) notFound();

  const submissions =
    assessment.type === "assignment"
      ? await getSubmissionsForAssessment(supabase, assessment.id)
      : [];
  const roster =
    assessment.type === "assignment"
      ? []
      : await getRosterForGradeEntry(supabase, assessment.id);
  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium capitalize text-ink-muted">
          {assessment.type} · {assessment.status}
        </p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          {assessment.title}
        </h1>
        {assessment.dueDate ? (
          <p className="mt-1 text-sm text-ink-secondary">
            Due {new Date(assessment.dueDate).toLocaleString("en-GB")}
          </p>
        ) : null}
      </header>

      <div className="p-4 lg:p-8">
        {assessment.type === "assignment" ? (
          <SubmissionGrader
            submissions={submissions}
            maxScore={assessment.maxScore}
            initialSelectedId={selectedId}
          />
        ) : (
          <GradeRosterForm
            key={roster.map((row) => row.releasedAt ?? "").join("|")}
            assessmentId={assessment.id}
            maxScore={assessment.maxScore}
            rows={roster}
          />
        )}
      </div>
    </main>
  );
}
