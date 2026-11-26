import type { SubscriptionStatus } from "@/lib/platform/schools";
import { badgeBase } from "@/lib/ui/styles";

type TenantStatusPillProps = {
  status: SubscriptionStatus;
};

const statusClassName: Record<SubscriptionStatus, string> = {
  Trial: `${badgeBase} rounded-full border-warning-border bg-warning-subtle text-warning`,
  Active: `${badgeBase} rounded-full border-success-border bg-success-subtle text-success`,
  Suspended: `${badgeBase} rounded-full border-danger-border bg-danger-subtle text-danger`,
  Cancelled: `${badgeBase} rounded-full border-line bg-surface-muted text-ink-muted line-through`,
};

const tenantAccentClassName: Record<SubscriptionStatus, string> = {
  Trial: "border-l-warning",
  Active: "border-l-success",
  Suspended: "border-l-danger",
  Cancelled: "border-l-line-strong",
};

const tenantAvatarClassName: Record<SubscriptionStatus, string> = {
  Trial: "bg-warning-subtle text-warning",
  Active: "bg-success-subtle text-success",
  Suspended: "bg-danger-subtle text-danger",
  Cancelled: "bg-surface-muted text-ink-muted",
};

export function tenantAccentClass(status: SubscriptionStatus): string {
  return tenantAccentClassName[status];
}

export function tenantAvatarClass(status: SubscriptionStatus): string {
  return tenantAvatarClassName[status];
}

export function TenantStatusPill({ status }: TenantStatusPillProps) {
  return <span className={statusClassName[status]}>{status}</span>;
}
