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
      <PageHeader variant="section" eyebrow={assessment.type} title="Assignment" />
      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 md:px-8">
        <section>
          <h2 className="text-xl font-bold leading-7">{assessment.title}</h2>
          {assessment.dueDate ? (
            <p className="mt-2 text-sm text-ink-secondary">
              Due {new Date(assessment.dueDate).toLocaleString()}
            </p>
          ) : null}
          {assessment.instructions ? (
            <p className="mt-3 text-sm leading-6">{assessment.instructions}</p>
          ) : null}
        </section>

        {grade ? (
          <section className="border border-line bg-surface-muted p-4">
            <p className="text-xs font-bold uppercase text-ink-secondary">Grade</p>
            <p className="mt-1 text-lg font-bold">
              {grade.score ?? "—"}
              {assessment.maxScore !== null ? ` / ${assessment.maxScore}` : ""}
            </p>
            {grade.feedback ? (
              <p className="mt-2 text-sm leading-6">{grade.feedback}</p>
            ) : null}
          </section>
        ) : null}

        {assessment.type === "assignment" ? (
          submission ? (
            <section className="border border-line p-4">
              <p className="text-xs font-bold uppercase text-ink-secondary">Handed in</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {submission.text}
              </p>
            </section>
          ) : (
            <SubmitAssignmentForm assessmentId={assessment.id} />
          )
        ) : (
          <p className="text-sm text-ink-secondary">
            This {assessment.type} is scored by your teacher. There is nothing to hand in.
          </p>
        )}
      </main>
    </>
  );
}
