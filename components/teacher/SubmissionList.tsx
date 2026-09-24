import type { SubmissionListItem } from "@/lib/stubs/get-submissions-for-assessment";
import { StatusBadge } from "@/components/shared/StatusBadge";

type SubmissionListProps = {
  title: string;
  subtitle: string;
  submissions: SubmissionListItem[];
};

export function SubmissionList({
  title,
  subtitle,
  submissions,
}: SubmissionListProps) {
  return (
    <section className="border border-[#999999] bg-white">
      <div className="border-b border-[#999999] p-5">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-[#666666]">{subtitle}</p>
      </div>

      <div className="divide-y divide-[#E5E5E5]">
        {submissions.map((submission) => (
          <button
            key={submission.id}
            type="button"
            className={
              submission.selected
                ? "w-full border-l-4 border-[#333333] bg-[#E5E5E5] p-5 text-left"
                : "w-full p-5 text-left"
            }
          >
            <div className="flex justify-between gap-3">
              <span
                className={
                  submission.selected ? "font-semibold" : "font-medium"
                }
              >
                {submission.studentName}
              </span>
              <StatusBadge label={submission.status} />
            </div>
            <p className="mt-2 text-sm text-[#666666]">{submission.meta}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
