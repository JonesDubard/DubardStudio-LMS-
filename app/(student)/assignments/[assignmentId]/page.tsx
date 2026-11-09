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
      <main className="space-y-5 px-4 py-5">
        <section>
          <h2 className="text-xl font-bold leading-7">{assessment.title}</h2>
          {assessment.dueDate ? (
            <p className="mt-2 text-sm text-[#666666]">
              Due {new Date(assessment.dueDate).toLocaleString()}
            </p>
          ) : null}
          {assessment.instructions ? (
            <p className="mt-3 text-sm leading-6">{assessment.instructions}</p>
          ) : null}
        </section>

        {grade ? (
          <section className="border border-[#999999] bg-[#E5E5E5] p-4">
            <p className="text-xs font-bold uppercase text-[#666666]">Grade</p>
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
            <section className="border border-[#999999] p-4">
              <p className="text-xs font-bold uppercase text-[#666666]">Handed in</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {submission.text}
              </p>
            </section>
          ) : (
            <SubmitAssignmentForm assessmentId={assessment.id} />
          )
        ) : (
          <p className="text-sm text-[#666666]">
            This {assessment.type} is scored by your teacher. There is nothing to hand in.
          </p>
        )}
      </main>
    </>
  );
}
