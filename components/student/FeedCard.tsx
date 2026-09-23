import type { ReactNode } from "react";
import { StatusBadge } from "@/components/student/StatusBadge";

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
    <article
      className={`border border-[#999999] bg-white p-4 ${className}`.trim()}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[#666666]">
            {eyebrow}
          </p>
          <h3 className="mt-1 text-sm font-bold">{title}</h3>
          <p className="mt-1 text-xs text-[#666666]">{meta}</p>
        </div>

        {showMark ? (
          <div className="h-8 w-8 shrink-0 border border-[#999999] bg-[#E5E5E5]">
            <div className="flex h-full items-center justify-center text-xs text-[#666666]">
              /
            </div>
          </div>
        ) : null}

        {badge ? <StatusBadge label={badge} tone="due" /> : null}
      </div>

      {description ? (
        <p className="mb-3 text-xs leading-5 text-[#666666]">{description}</p>
      ) : null}

      {children}
    </article>
  );
}
