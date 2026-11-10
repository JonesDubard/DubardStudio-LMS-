import type { Metadata } from "next";
import Link from "next/link";
import { MaterialRow } from "@/components/student/MaterialRow";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { getSubmissionStatus } from "@/lib/stubs/get-submission-status";
import { buttonSecondary, surfaceCard } from "@/lib/ui/styles";

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
      <PageHeader variant="section" eyebrow={status.subject} title={status.headerTitle} />

      <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 md:px-8">
        <section className={`${surfaceCard} p-5 text-center`}>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {status.confirmationTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-prose text-sm leading-6 text-ink-secondary">
            {status.confirmationDetail}
          </p>
        </section>

        <section className={`${surfaceCard} p-4`}>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {status.summaryLabel}
          </p>
          <h2 className="mt-1 text-base font-semibold text-ink">{status.title}</h2>

          <dl className="mt-3 divide-y divide-line">
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-ink-secondary">{status.submittedLabel}</dt>
              <dd className="text-sm font-medium text-ink">{status.submittedAt}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-ink-secondary">{status.dueLabel}</dt>
              <dd className="text-sm font-medium text-ink">{status.dueValue}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-ink-secondary">{status.statusLabel}</dt>
              <dd>
                <StatusBadge label={status.statusBadge} tone="submitted" />
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-ink">{status.workTitle}</h2>
          <div className={`${surfaceCard} p-4`}>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {status.answerLabel}
            </p>
            <p className="mt-2 max-w-prose text-base leading-7 text-ink">{status.answer}</p>
          </div>
          <MaterialRow
            title={status.attachmentName}
            meta={status.attachmentMeta}
            action={
              <span className="text-xs font-medium text-ink-secondary">{status.attachmentState}</span>
            }
          />
        </section>

        <section className="rounded-lg bg-surface-muted p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {status.reviewLabel}
          </p>
          <p className="mt-2 text-sm font-semibold text-ink">{status.reviewState}</p>
          <p className="mt-1 max-w-prose text-sm leading-6 text-ink-secondary">{status.reviewDetail}</p>
        </section>

        <Link href="/feed" className={`${buttonSecondary} w-full sm:w-auto`}>
          {status.backLabel}
        </Link>
      </main>
    </>
  );
}
