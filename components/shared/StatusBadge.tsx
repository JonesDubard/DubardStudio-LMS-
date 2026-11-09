import { badgeBase } from "@/lib/ui/styles";

const toneClass = {
  due: `${badgeBase} border-warning-border bg-warning-subtle text-warning`,
  dueOnLight: `${badgeBase} border-warning-border bg-surface text-warning`,
  submitted: `${badgeBase} border-success-border bg-success-subtle text-success`,
  ready: `${badgeBase} border-info-border bg-info-subtle text-info`,
} as const;

type StatusBadgeProps = {
  label: string;
  tone?: keyof typeof toneClass;
  className?: string;
};

export function StatusBadge({
  label,
  tone,
  className = `${badgeBase} border-line bg-surface-muted text-ink-secondary`,
}: StatusBadgeProps) {
  return <span className={tone ? toneClass[tone] : className}>{label}</span>;
}
