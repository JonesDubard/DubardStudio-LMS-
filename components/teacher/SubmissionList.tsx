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
    <section className="rounded-lg border border-line bg-surface shadow-card">
      <div className="border-b border-line p-5">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>
      </div>

      <div className="divide-y divide-line">
        {submissions.map((submission) => (
          <button
            key={submission.id}
            type="button"
            className={
              submission.selected
                ? "w-full border-l-4 border-brand-primary bg-brand-subtle p-5 text-left"
                : "w-full p-5 text-left hover:bg-surface-muted"
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
            <p className="mt-2 text-sm text-ink-secondary">{submission.meta}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
