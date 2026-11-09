import type { Metadata } from "next";
import { MaterialRow } from "@/components/student/MaterialRow";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { getSubmissionStatus } from "@/lib/stubs/get-submission-status";

export const metadata: Metadata = {
  title: "Submission Status",
};

export default async function SubmissionStatusPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const status = getSubmissionStatus(assignmentId);

  return (
    <>
      <PageHeader
        variant="section"
        eyebrow={status.subject}
        title={status.headerTitle}
      />

      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 lg:px-8">
        <section className="border border-line bg-surface-muted p-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-line-strong bg-surface">
            <span className="text-xl font-bold text-ink">/</span>
          </div>

          <h2 className="mt-4 text-lg font-bold">{status.confirmationTitle}</h2>

          <p className="mt-2 text-sm leading-5 text-ink-secondary">
            {status.confirmationDetail}
          </p>
        </section>

        <section className="border border-line p-4">
          <div className="border-b border-line-subtle pb-3">
            <p className="text-xs font-semibold uppercase text-ink-secondary">
              {status.summaryLabel}
            </p>
            <h3 className="mt-1 text-sm font-bold">{status.title}</h3>
          </div>

          <dl className="divide-y divide-line">
            <div className="flex items-center justify-between py-3">
              <dt className="text-xs text-ink-secondary">{status.submittedLabel}</dt>
              <dd className="text-xs font-semibold text-ink">
                {status.submittedAt}
              </dd>
            </div>

            <div className="flex items-center justify-between py-3">
              <dt className="text-xs text-ink-secondary">{status.dueLabel}</dt>
              <dd className="text-xs font-semibold text-ink">
                {status.dueValue}
              </dd>
            </div>

            <div className="flex items-center justify-between py-3">
              <dt className="text-xs text-ink-secondary">{status.statusLabel}</dt>
              <dd>
                <StatusBadge label={status.statusBadge} tone="submitted" />
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">{status.workTitle}</h3>

          <div className="space-y-2">
            <div className="border border-line p-3">
              <p className="text-xs font-semibold text-ink-secondary">
                {status.answerLabel}
              </p>
              <p className="mt-2 text-sm leading-5 text-ink">
                {status.answer}
              </p>
            </div>

            <MaterialRow
              title={status.attachmentName}
              meta={status.attachmentMeta}
              action={
                <span className="text-xs font-bold text-ink-secondary">
                  {status.attachmentState}
                </span>
              }
            />
          </div>
        </section>

        <section className="border border-line-subtle bg-surface-muted p-4">
          <p className="text-xs font-bold uppercase text-ink-secondary">
            {status.reviewLabel}
          </p>

          <p className="mt-2 text-sm font-semibold text-ink">
            {status.reviewState}
          </p>

          <p className="mt-1 text-xs leading-5 text-ink-secondary">
            {status.reviewDetail}
          </p>
        </section>

        <PrimaryButton href="/feed">{status.backLabel}</PrimaryButton>
      </main>
    </>
  );
}
