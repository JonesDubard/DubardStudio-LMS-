import { Check, Circle } from "lucide-react";
import { badgeBase, surfaceCard } from "@/lib/ui/styles";

export type SetupProgressItem = {
  id: string;
  title: string;
  description: string;
  complete: boolean;
};

type SetupProgressCardProps = {
  title: string;
  description: string;
  progressLabel: string;
  items: SetupProgressItem[];
};

export function SetupProgressCard({
  title,
  description,
  progressLabel,
  items,
}: SetupProgressCardProps) {
  return (
    <section className={`${surfaceCard} p-6`}>
      <div className="flex items-center justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
          <p className="mt-1 text-sm text-ink-secondary">{description}</p>
        </div>

        <span className={`${badgeBase} border-line bg-surface-muted px-3 py-1.5 text-sm text-ink-secondary`}>
          {progressLabel}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={
              item.complete
                ? "rounded-lg border border-success-border bg-success-subtle p-4"
                : "rounded-lg border border-line bg-surface p-4"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium text-ink">{item.title}</span>
              {item.complete ? (
                <Check size={16} strokeWidth={1.75} className="text-success" aria-label="Complete" />
              ) : (
                <Circle size={16} strokeWidth={1.75} className="text-ink-disabled" aria-label="Not started" />
              )}
            </div>
            <p className="mt-2 text-sm text-ink-secondary">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
