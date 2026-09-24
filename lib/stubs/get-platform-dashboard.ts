import { TENANTS, type SubscriptionStatus } from "@/lib/stubs/get-tenants";

export interface PlatformSummaryTile {
  id: string;
  label: string;
  value: string;
}

export interface OnboardingRow {
  id: string;
  name: string;
  status: SubscriptionStatus;
  branding: boolean;
  academic: boolean;
  teachersInvited: boolean;
  firstLesson: boolean;
}

export interface RecentAuditItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
}

export interface PlatformDashboard {
  eyebrow: string;
  title: string;
  subtitle: string;
  summaryTiles: PlatformSummaryTile[];
  onboardingTitle: string;
  onboardingDescription: string;
  onboardingRows: OnboardingRow[];
  recentAuditTitle: string;
  recentAuditItems: RecentAuditItem[];
}

export function getPlatformDashboard(): PlatformDashboard {
  return {
    eyebrow: "Platform Admin",
    title: "Dashboard",
    subtitle: "Overview of tenants, subscriptions, and onboarding status.",
    summaryTiles: [
      { id: "total", label: "Total Tenants", value: "5" },
      { id: "active", label: "Active", value: "2" },
      { id: "trial", label: "Trial", value: "1" },
      { id: "suspended", label: "Suspended", value: "1" },
      { id: "cancelled", label: "Cancelled", value: "1" },
    ],
    onboardingTitle: "Onboarding Status",
    onboardingDescription: "Current setup progress across all tenants.",
    onboardingRows: TENANTS.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      status: tenant.status,
      branding: tenant.onboarding.branding,
      academic: tenant.onboarding.academic,
      teachersInvited: tenant.onboarding.teachersInvited,
      firstLesson: tenant.onboarding.firstLesson,
    })),
    recentAuditTitle: "Recent Audit Activity",
    recentAuditItems: [
      {
        id: "1",
        title: "Changed subscription status",
        detail: "Pilot School #1 · Trial → Active",
        timestamp: "2026-09-24 14:32 UTC",
      },
      {
        id: "2",
        title: "Viewed tenant usage",
        detail: "Monrovia Academy",
        timestamp: "2026-09-24 13:51 UTC",
      },
      {
        id: "3",
        title: "Created tenant",
        detail: "Hope International School",
        timestamp: "2026-09-24 12:18 UTC",
      },
      {
        id: "4",
        title: "Suspended tenant",
        detail: "Brewerville Community School",
        timestamp: "2026-09-23 16:07 UTC",
      },
      {
        id: "5",
        title: "Viewed tenant profile",
        detail: "St. Paul's Learning Center",
        timestamp: "2026-09-23 11:42 UTC",
      },
    ],
  };
}
