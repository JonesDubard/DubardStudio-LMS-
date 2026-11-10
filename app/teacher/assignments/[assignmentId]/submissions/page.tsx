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
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium text-ink-muted">{data.eyebrow}</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold tracking-tight md:text-2xl">
              {data.assessment.title}
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {data.assessment.subject} · {data.assessment.className} · Due{" "}
              {data.assessment.dueLabel}
            </p>
          </div>
          <StatusBadge label={data.pendingLabel} />
        </div>
      </header>

      <div className="p-4 lg:p-8">
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
