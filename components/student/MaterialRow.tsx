import type { ReactNode } from "react";

type MaterialRowProps = {
  title: string;
  meta: string;
  action: ReactNode;
};

export function MaterialRow({ title, meta, action }: MaterialRowProps) {
  return (
    <div className="flex items-center justify-between border border-[#999999] p-3">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-[#666666]">{meta}</p>
      </div>
      {action}
    </div>
  );
}
