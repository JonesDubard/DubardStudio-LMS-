import { getTenant } from "@/lib/stubs/get-tenant";
import type { SubscriptionStatus } from "@/lib/stubs/get-tenants";

export interface SubscriptionOption {
  value: SubscriptionStatus;
  label: string;
  description: string;
}

export interface SubscriptionHistoryRow {
  id: string;
  date: string;
  from: string;
  to: string;
  admin: string;
}

export interface TenantSubscription {
  tenantId: string;
  tenantName: string;
  subdomainHost: string;
  status: SubscriptionStatus;
  tabs: { label: string; href: string; active: boolean }[];
  options: SubscriptionOption[];
  gateNoticeTitle: string;
  gateNoticeBody: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmCancelLabel: string;
  confirmActionLabel: string;
  historyTitle: string;
  history: SubscriptionHistoryRow[];
}

export function getTenantSubscription(tenantId: string): TenantSubscription {
  const tenant = getTenant(tenantId);

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    subdomainHost: tenant.subdomainHost,
    status: tenant.status,
    tabs: [
      {
        label: "Profile",
        href: `/platform/tenants/${tenant.id}`,
        active: false,
      },
      {
        label: "Subscription",
        href: `/platform/tenants/${tenant.id}/subscription`,
        active: true,
      },
      { label: "Onboarding", href: "#", active: false },
      { label: "Usage", href: "#", active: false },
      { label: "Authorized Access", href: "#", active: false },
    ],
    options: [
      {
        value: "Trial",
        label: "Trial",
        description: "Tenant has trial access.",
      },
      {
        value: "Active",
        label: "Active",
        description: "Tenant has active access.",
      },
      {
        value: "Suspended",
        label: "Suspended",
        description: "Tenant access is suspended.",
      },
      {
        value: "Cancelled",
        label: "Cancelled",
        description: "Tenant access is cancelled.",
      },
    ],
    gateNoticeTitle: "Changing status gates access at the authentication layer.",
    gateNoticeBody: "This action will be logged.",
    confirmTitle: "Confirm subscription change",
    confirmDescription: `You are changing ${tenant.name} from Trial to Suspended. This will affect tenant access and create an audit event.`,
    confirmCancelLabel: "Cancel Change",
    confirmActionLabel: "Change Status",
    historyTitle: "Subscription History",
    history: [
      {
        id: "1",
        date: "2026-09-10 09:15 UTC",
        from: "—",
        to: "Trial",
        admin: "Edmore Jones",
      },
      {
        id: "2",
        date: "2026-09-18 11:03 UTC",
        from: "Trial",
        to: "Trial",
        admin: "Edmore Jones",
      },
    ],
  };
}
