import type { Metadata } from "next";
import { SubmissionDetail } from "@/components/teacher/SubmissionDetail";
import { SubmissionList } from "@/components/teacher/SubmissionList";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getSubmissionsForAssessment } from "@/lib/stubs/get-submissions-for-assessment";

export const metadata: Metadata = {
  title: "Submission Grading",
};

type SubmissionsPageProps = {
  params: Promise<{ assignmentId: string }>;
};

export default async function AssignmentSubmissionsPage({
  params,
}: SubmissionsPageProps) {
  const { assignmentId } = await params;
  const data = getSubmissionsForAssessment(assignmentId);

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 md:px-8 md:py-6">
        <p className="text-sm text-ink-secondary">{data.eyebrow}</p>
        <div className="mt-1 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">{data.assessment.title}</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {data.assessment.subject} · {data.assessment.className} · Due{" "}
              {data.assessment.dueLabel}
            </p>
          </div>
          <StatusBadge
            label={data.pendingLabel}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold tracking-tight text-ink shadow-card transition-colors duration-150 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <SubmissionList
            title={data.listTitle}
            subtitle={data.listSubtitle}
            submissions={data.submissions}
          />
          <SubmissionDetail submission={data.selected} />
        </div>
      </div>
    </main>
  );
}
