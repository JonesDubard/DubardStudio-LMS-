import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubmitAssignmentForm } from "@/components/student/SubmitAssignmentForm";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  getAssessmentDetails,
  getMyReleasedGrade,
  getMySubmission,
} from "@/lib/queries/assessments";
import { createClient } from "@/lib/supabase/server";
import { surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Assignment",
};

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const supabase = await createClient();
  const assessment = await getAssessmentDetails(supabase, assignmentId);
  if (!assessment || assessment.status !== "published") notFound();

  const [submission, grade] = await Promise.all([
    assessment.type === "assignment"
      ? getMySubmission(supabase, assessment.id)
      : Promise.resolve(null),
    getMyReleasedGrade(supabase, assessment.id),
  ]);

  return (
    <>
      <PageHeader variant="section" eyebrow={assessment.type} title={assessment.title} />
      <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 md:px-8">
        {assessment.dueDate ? (
          <p className="text-sm leading-6 text-ink-secondary">
            Due {new Date(assessment.dueDate).toLocaleString()}
          </p>
        ) : null}

        {assessment.instructions ? (
          <section className="max-w-prose space-y-2">
            <h2 className="text-sm font-semibold tracking-tight text-ink">Instructions</h2>
            <p className="whitespace-pre-wrap text-base leading-7 text-ink">
              {assessment.instructions}
            </p>
          </section>
        ) : null}

        {grade ? (
          <section className={`${surfaceCard} p-4`}>
            <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">Grade</h2>
            <p className="mt-1 text-lg font-semibold text-ink">
              {grade.score ?? "—"}
              {assessment.maxScore !== null ? ` / ${assessment.maxScore}` : ""}
            </p>
            {grade.feedback ? (
              <p className="mt-2 max-w-prose text-sm leading-6 text-ink-secondary">{grade.feedback}</p>
            ) : null}
          </section>
        ) : null}

        {assessment.type === "assignment" ? (
          submission ? (
            <section className={`${surfaceCard} p-4`}>
              <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Handed in
              </h2>
              <p className="mt-2 max-w-prose whitespace-pre-wrap text-base leading-7 text-ink">
                {submission.text ?? "No written answer."}
              </p>
              {submission.fileName ? (
                <p className="mt-3 text-sm text-ink-secondary">File: {submission.fileName}</p>
              ) : grade ? null : (
                <div className="mt-4">
                  <SubmitAssignmentForm assessmentId={assessment.id} mode="attach" />
                </div>
              )}
            </section>
          ) : (
            <SubmitAssignmentForm assessmentId={assessment.id} />
          )
        ) : (
          <p className="max-w-prose text-sm leading-6 text-ink-secondary">
            This {assessment.type} is scored by your teacher. There is nothing to hand in.
          </p>
        )}
      </main>
    </>
  );
}
