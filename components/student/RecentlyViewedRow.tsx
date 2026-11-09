import { BookOpen } from "lucide-react";

type RecentlyViewedRowProps = {
  title: string;
  meta: string;
  actionLabel: string;
};

export function RecentlyViewedRow({
  title,
  meta,
  actionLabel,
}: RecentlyViewedRowProps) {
  return (
    <article className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3 shadow-card">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-muted">
        <BookOpen size={18} strokeWidth={1.75} aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-ink">{title}</h3>
        <p className="text-xs text-ink-secondary">{meta}</p>
      </div>

      <span className="text-xs font-medium text-ink-secondary">{actionLabel}</span>
    </article>
  );
}
