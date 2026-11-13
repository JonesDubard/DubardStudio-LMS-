import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { surfaceCard } from "@/lib/ui/styles";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={`${surfaceCard} px-6 py-10 text-center`}>
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
        <Icon size={20} strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="mt-3 text-base font-semibold tracking-tight text-ink">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-ink-secondary">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
