import { Megaphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/shared/Card";

type AnnouncementCardProps = {
  category: string;
  title: string;
  description: string;
  icon?: LucideIcon;
};

export function AnnouncementCard({
  category,
  title,
  description,
  icon: Icon = Megaphone,
}: AnnouncementCardProps) {
  const normalizedCategory = category.toLowerCase();
  const styles = normalizedCategory.includes("assignment")
    ? {
        icon: "bg-orange-50 text-orange-600",
        badge: "border-orange-200 bg-orange-50 text-orange-700",
      }
    : normalizedCategory.includes("assembly")
      ? {
          icon: "bg-blue-50 text-blue-700",
          badge: "border-blue-200 bg-blue-50 text-blue-700",
        }
      : {
          icon: "bg-brand-subtle text-brand-primary",
          badge: "border-brand-border bg-brand-subtle text-brand-primary",
        };

  return (
    <Card className="rounded-2xl border-line-subtle p-3 shadow-card">
      <article className="flex items-start gap-2.5">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.icon}`}
        >
          <Icon size={16} strokeWidth={1.9} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex justify-end">
            <span
              className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${styles.badge}`}
            >
              {category}
            </span>
          </div>
          <div className="mt-2 rounded-xl bg-surface-muted p-3">
            <h3 className="break-words text-sm font-semibold leading-5 tracking-tight text-ink">
              {title}
            </h3>
            <p className="mt-1.5 text-xs leading-[1.4rem] text-ink-secondary">
              {description}
            </p>
          </div>
        </div>
      </article>
    </Card>
  );
}
