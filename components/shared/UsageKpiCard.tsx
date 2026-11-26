import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/shared/Card";

type UsageKpiCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  iconTone?: "neutral" | "success" | "info";
};

const iconToneClasses = {
  neutral: "bg-surface-muted text-ink-secondary",
  success: "bg-success-subtle text-success",
  info: "bg-info-subtle text-info",
} as const;

export function UsageKpiCard({
  label,
  value,
  detail,
  icon: Icon,
  iconTone = "neutral",
}: UsageKpiCardProps) {
  return (
    <Card className="flex min-h-32 items-start justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          {value}
        </p>
        <p className="mt-1 text-xs text-ink-secondary">{detail}</p>
        <span className="mt-3 inline-flex rounded-full border border-brand-border bg-brand-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
          Preview Data
        </span>
      </div>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconToneClasses[iconTone]}`}
      >
        <Icon size={19} strokeWidth={1.8} aria-hidden />
      </span>
    </Card>
  );
}
