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
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">{data.eyebrow}</p>
        <div className="mt-1 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">{data.assessment.title}</h1>
            <p className="mt-1 text-sm text-[#666666]">
              {data.assessment.subject} · {data.assessment.className} · Due{" "}
              {data.assessment.dueLabel}
            </p>
          </div>
          <StatusBadge
            label={data.pendingLabel}
            className="border border-[#999999] px-3 py-2 text-sm"
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
