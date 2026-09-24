import { TENANTS, type SubscriptionStatus } from "@/lib/stubs/get-tenants";

export interface TenantDetail {
  id: string;
  name: string;
  contactPerson: string;
  contactEmail: string;
  subdomain: string;
  subdomainHost: string;
  status: SubscriptionStatus;
  createdAt: string;
  gradeRange: string;
  tabs: { label: string; href: string; active: boolean }[];
  auditButtonLabel: string;
  editButtonLabel: string;
  elevatedReminderTitle: string;
  elevatedReminderBody: string;
}

export function getTenant(tenantId: string): TenantDetail {
  const tenant = TENANTS.find((item) => item.id === tenantId) ?? TENANTS[0];

  return {
    id: tenant.id,
    name: tenant.name,
    contactPerson: "Mrs. Abena Kollie",
    contactEmail: "admin@pilotschool.edu.lr",
    subdomain: tenant.subdomain,
    subdomainHost: tenant.subdomainHost,
    status: tenant.status,
    createdAt: "2026-09-10 09:15 UTC",
    gradeRange: "Both",
    tabs: [
      {
        label: "Profile",
        href: `/platform/tenants/${tenant.id}`,
        active: true,
      },
      {
        label: "Subscription",
        href: `/platform/tenants/${tenant.id}/subscription`,
        active: false,
      },
      { label: "Onboarding", href: "#", active: false },
      { label: "Usage", href: "#", active: false },
      { label: "Authorized Access", href: "#", active: false },
    ],
    auditButtonLabel: "View Audit Activity",
    editButtonLabel: "Edit",
    elevatedReminderTitle: "Elevated access reminder",
    elevatedReminderBody:
      "Any cross-tenant administrative action taken from this tenant context will create an audit event.",
  };
}
