import type { ReactNode } from "react";
import { surfaceCard } from "@/lib/ui/styles";

type MaterialRowProps = {
  title: string;
  meta: string;
  action: ReactNode;
};

export function MaterialRow({ title, meta, action }: MaterialRowProps) {
  return (
    <div className={`${surfaceCard} flex items-center justify-between gap-4 p-4`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 truncate text-xs text-ink-secondary">{meta}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
