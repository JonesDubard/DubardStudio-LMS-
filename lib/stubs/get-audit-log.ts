export interface AuditAccessContext {
  ipAddress: string;
  sessionId: string;
  accessPath: string;
}

export interface AuditStateChange {
  before: string;
  after: string;
}

export interface AuditEventDetail {
  fullContext: string;
  accessContext: AuditAccessContext;
  stateChange: AuditStateChange;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  admin: string;
  tenant: string;
  action: string;
  resource: string;
  result: string;
  expandedByDefault: boolean;
  detail?: AuditEventDetail;
}

export interface AuditLog {
  eyebrow: string;
  title: string;
  subtitle: string;
  dateRangeValue: string;
  adminOptions: string[];
  tenantOptions: string[];
  actionOptions: string[];
  events: AuditEvent[];
}

export function getAuditLog(): AuditLog {
  return {
    eyebrow: "Platform Admin",
    title: "Audit Log",
    subtitle: "Cross-tenant access and administrative actions.",
    dateRangeValue: "2026-09-24 to 2026-09-24",
    adminOptions: ["All Admins", "Edmore Jones", "Platform Operations"],
    tenantOptions: [
      "All Tenants",
      "Pilot School #1",
      "Monrovia Academy",
      "St. Paul's Learning Center",
      "Brewerville Community School",
    ],
    actionOptions: [
      "All Actions",
      "View Tenant",
      "Change Subscription",
      "Create Tenant",
      "Suspend Tenant",
    ],
    events: [
      {
        id: "1",
        timestamp: "2026-09-24 14:32 UTC",
        admin: "Edmore Jones",
        tenant: "Pilot School #1",
        action: "Change Subscription",
        resource: "Tenant Subscription",
        result: "Success",
        expandedByDefault: true,
        detail: {
          fullContext:
            "Platform Admin changed the subscription status for Pilot School #1 through the elevated tenant administration path.",
          accessContext: {
            ipAddress: "197.157.22.84",
            sessionId: "sess_plat_8F4K21",
            accessPath: "Platform Console",
          },
          stateChange: {
            before: "subscription_status: Trial",
            after: "subscription_status: Active",
          },
        },
      },
      {
        id: "2",
        timestamp: "2026-09-24 13:51 UTC",
        admin: "Edmore Jones",
        tenant: "Monrovia Academy",
        action: "View Tenant",
        resource: "Usage",
        result: "Success",
        expandedByDefault: false,
      },
      {
        id: "3",
        timestamp: "2026-09-24 12:18 UTC",
        admin: "Platform Operations",
        tenant: "Hope International School",
        action: "Create Tenant",
        resource: "Tenant",
        result: "Success",
        expandedByDefault: false,
      },
      {
        id: "4",
        timestamp: "2026-09-23 16:07 UTC",
        admin: "Edmore Jones",
        tenant: "Brewerville Community School",
        action: "Suspend Tenant",
        resource: "Tenant Subscription",
        result: "Success",
        expandedByDefault: false,
      },
      {
        id: "5",
        timestamp: "2026-09-23 11:42 UTC",
        admin: "Edmore Jones",
        tenant: "St. Paul's Learning Center",
        action: "View Tenant",
        resource: "Profile",
        result: "Success",
        expandedByDefault: false,
      },
    ],
  };
}
