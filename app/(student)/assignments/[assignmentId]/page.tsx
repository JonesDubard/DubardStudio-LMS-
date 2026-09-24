import type { Metadata } from "next";
import Link from "next/link";
import { MaterialRow } from "@/components/student/MaterialRow";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getAssignment } from "@/lib/stubs/get-assignment";

export const metadata: Metadata = {
  title: "Assignment Detail",
};

const outlineButtonClass =
  "min-h-10 border border-[#333333] bg-white px-3 text-xs font-semibold text-[#333333]";

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const assignment = getAssignment(assignmentId);

  return (
    <>
      <PageHeader
        variant="section"
        eyebrow={assignment.subject}
        title={assignment.headerTitle}
      />

      <main className="space-y-5 px-4 py-5">
        <section>
          <p className="text-xs font-semibold uppercase text-[#666666]">
            {assignment.category}
          </p>

          <h2 className="mt-1 text-xl font-bold leading-7">{assignment.title}</h2>

          <div className="mt-3 flex items-center justify-between border border-[#999999] bg-[#E5E5E5] p-3">
            <div>
              <p className="text-[10px] font-bold uppercase text-[#666666]">
                {assignment.dueLabel}
              </p>
              <p className="mt-1 text-sm font-semibold">{assignment.dueValue}</p>
            </div>

            <StatusBadge label={assignment.badge} tone="dueOnLight" />
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">
            {assignment.instructionsTitle}
          </h3>

          <div className="border border-[#999999] p-4">
            <p className="text-sm leading-6 text-[#333333]">
              {assignment.instructions}
            </p>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">{assignment.materialsTitle}</h3>

          <MaterialRow
            title={assignment.material.name}
            meta={assignment.material.meta}
            action={
              <button className={outlineButtonClass} type="button">
                {assignment.material.actionLabel}
              </button>
            }
          />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">{assignment.submissionTitle}</h3>

          <div className="space-y-4 border border-[#999999] p-4">
            <div>
              <label
                htmlFor="answer"
                className="mb-2 block text-xs font-bold text-[#333333]"
              >
                {assignment.answerLabel}
              </label>

              <textarea
                id="answer"
                rows={6}
                className="w-full resize-none border border-[#999999] bg-white p-3 text-sm text-[#333333] outline-none"
                placeholder={assignment.answerPlaceholder}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-[#333333]">
                {assignment.attachLabel}
              </label>

              <div className="flex min-h-12 items-center justify-between gap-3 border border-dashed border-[#999999] bg-[#E5E5E5] px-3">
                <span className="min-w-0 flex-1 truncate text-xs text-[#666666]">
                  {assignment.attachEmpty}
                </span>

                <button className={`shrink-0 ${outlineButtonClass}`} type="button">
                  {assignment.attachAction}
                </button>
              </div>
            </div>
          </div>
        </section>

        <PrimaryButton>{assignment.submitLabel}</PrimaryButton>

        <Link
          href={`/assignments/${assignmentId}/status`}
          className="flex min-h-11 w-full items-center justify-center border border-[#999999] bg-[#E5E5E5] px-4 py-2 text-sm font-semibold text-[#333333]"
        >
          {assignment.statusLabel}
        </Link>
      </main>
    </>
  );
}
