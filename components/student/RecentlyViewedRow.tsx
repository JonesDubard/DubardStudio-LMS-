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
    <article className="flex items-center gap-3 border border-[#E5E5E5] bg-[#E5E5E5] p-3">
      <div className="h-10 w-10 shrink-0 border border-[#999999] bg-white">
        <div className="flex h-full items-center justify-center text-xs text-[#666666]">
          /
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold">{title}</h3>
        <p className="text-xs text-[#666666]">{meta}</p>
      </div>

      <span className="text-xs font-bold text-[#666666]">{actionLabel}</span>
    </article>
  );
}
