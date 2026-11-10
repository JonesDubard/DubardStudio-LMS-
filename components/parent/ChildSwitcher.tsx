import Link from "next/link";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

type Child = { id: string; name: string };

export function childHref(path: string, childId: string): string {
  return `${path}?child=${childId}`;
}

export function NoLinkedChildren() {
  return (
    <EmptyState
      icon={Users}
      title="No children linked to your account."
      description="Please contact your school administrator to link your child."
    />
  );
}

export function ChildSwitcher({
  linked,
  selectedId,
  basePath,
}: {
  linked: Child[];
  selectedId: string;
  basePath: string;
}) {
  const selected = linked.find((child) => child.id === selectedId);

  if (linked.length <= 1) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Child</p>
        <p className="mt-1 text-lg font-semibold tracking-tight text-ink">{selected?.name}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Children</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {linked.map((child) => {
          const active = child.id === selectedId;
          return (
            <Link
              key={child.id}
              href={childHref(basePath, child.id)}
              aria-current={active ? "true" : undefined}
              className={
                active
                  ? "inline-flex min-h-11 shrink-0 items-center rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white"
                  : "inline-flex min-h-11 shrink-0 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink"
              }
            >
              {child.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
