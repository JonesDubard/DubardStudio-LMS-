import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { surfaceCard } from "@/lib/ui/styles";

type FeedCardProps = {
  eyebrow: string;
  title: string;
  meta: string;
  description?: string;
  badge?: string;
  showMark?: boolean;
  className?: string;
  children: ReactNode;
};

export function FeedCard({
  eyebrow,
  title,
  meta,
  description,
  badge,
  showMark = false,
  className = "",
  children,
}: FeedCardProps) {
  return (
    <article className={`${surfaceCard} p-4 ${className}`.trim()}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {eyebrow}
          </p>
          <h3 className="mt-1 break-words text-base font-semibold tracking-tight text-ink">
            {title}
          </h3>
          <p className="mt-1 text-[13px] text-ink-secondary">{meta}</p>
        </div>

        {showMark ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-muted">
            <BookOpen size={16} strokeWidth={1.75} aria-hidden />
          </div>
        ) : null}

        {badge ? <StatusBadge label={badge} tone="due" /> : null}
      </div>

      {description ? (
        <p className="mb-3 text-sm leading-6 text-ink-secondary">{description}</p>
      ) : null}

      {children}
    </article>
  );
}
