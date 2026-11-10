import { StatusBadge } from "@/components/shared/StatusBadge";
import { surfaceCard } from "@/lib/ui/styles";
import type { ParentAssignment, ParentGrade } from "@/lib/queries/parent";

export function AssignmentCards({ items }: { items: ParentAssignment[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((item) => (
        <article key={item.id} className={`${surfaceCard} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                {item.subjectName}
              </p>
              <h3 className="mt-1 break-words text-base font-semibold tracking-tight text-ink">
                {item.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-ink-secondary">{item.dueLabel}</p>
            </div>
            <StatusBadge
              label={item.status === "overdue" ? "Overdue" : "Upcoming"}
              tone={item.status === "overdue" ? "due" : "ready"}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

export function GradeCards({ items }: { items: ParentGrade[] }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {items.map((item) => (
        <article key={item.id} className={`${surfaceCard} p-4`}>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {item.subjectName}
          </p>
          <h3 className="mt-1 break-words text-base font-semibold tracking-tight text-ink">
            {item.title}
          </h3>
          <p className="mt-2 text-lg font-semibold text-ink">{item.scoreLabel}</p>
          {item.feedback ? (
            <p className="mt-2 text-sm leading-6 text-ink-secondary">{item.feedback}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
