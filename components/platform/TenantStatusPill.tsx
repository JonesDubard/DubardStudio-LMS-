import type { SubscriptionStatus } from "@/lib/platform/schools";
import { badgeBase } from "@/lib/ui/styles";

type TenantStatusPillProps = {
  status: SubscriptionStatus;
};

const statusClassName: Record<SubscriptionStatus, string> = {
  Trial: `${badgeBase} rounded-full border-info-border bg-info-subtle text-info`,
  Active: `${badgeBase} rounded-full border-success-border bg-success-subtle text-success`,
  Suspended: `${badgeBase} rounded-full border-warning-border bg-warning-subtle text-warning`,
  Cancelled: `${badgeBase} rounded-full border-line bg-surface-muted text-ink-muted line-through`,
};

export function TenantStatusPill({ status }: TenantStatusPillProps) {
  return <span className={statusClassName[status]}>{status}</span>;
}
