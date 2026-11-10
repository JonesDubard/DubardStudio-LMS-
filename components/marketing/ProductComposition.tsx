import { StatusBadge } from "@/components/shared/StatusBadge";
import { surfaceCard } from "@/lib/ui/styles";

export function ProductComposition() {
  return (
    <figure className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
      <figcaption className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
        Example of a school space
      </figcaption>
      <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        <div className="bg-brand-primary px-5 py-5 text-white">
          <p className="text-xs font-medium text-white">Your school</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">Academic home</p>
          <p className="mt-2 max-w-xs text-sm leading-5 text-white">
            Lessons, assignments, and grades for the classes you already teach.
          </p>
        </div>
        <div className="space-y-3 bg-canvas p-4">
          <article className={`${surfaceCard} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Lesson
                </p>
                <h3 className="mt-1 text-base font-semibold tracking-tight text-ink">
                  Introduction to fractions
                </h3>
                <p className="mt-1 text-sm text-ink-secondary">Mathematics · JSS 2</p>
              </div>
              <StatusBadge label="Ready" tone="ready" />
            </div>
          </article>
          <article className={`${surfaceCard} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Assignment
                </p>
                <h3 className="mt-1 text-base font-semibold tracking-tight text-ink">
                  Practice set
                </h3>
                <p className="mt-1 text-sm text-ink-secondary">Due this week · JSS 2</p>
              </div>
              <StatusBadge label="Due" tone="due" />
            </div>
          </article>
        </div>
      </div>
    </figure>
  );
}
