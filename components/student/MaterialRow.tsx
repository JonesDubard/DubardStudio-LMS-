import type { ReactNode } from "react";

type MaterialRowProps = {
  title: string;
  meta: string;
  action: ReactNode;
};

export function MaterialRow({ title, meta, action }: MaterialRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border border-[#999999] p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="mt-1 truncate text-xs text-[#666666]">{meta}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
