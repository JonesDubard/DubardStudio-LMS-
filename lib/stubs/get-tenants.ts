export type SubscriptionStatus =
  | "Trial"
  | "Active"
  | "Suspended"
  | "Cancelled";

export interface TenantOnboarding {
  branding: boolean;
  academic: boolean;
  teachersInvited: boolean;
  firstLesson: boolean;
}

export interface TenantListItem {
  id: string;
  name: string;
  subdomain: string;
  subdomainHost: string;
  status: SubscriptionStatus;
  onboarding: TenantOnboarding;
  onboardingLabel: string;
  createdDate: string;
}

export interface TenantsList {
  eyebrow: string;
  title: string;
  subtitle: string;
  createLabel: string;
  statusFilterOptions: string[];
  searchPlaceholder: string;
  suspendLabel: string;
  exportLabel: string;
  tenants: TenantListItem[];
}

export const TENANTS: TenantListItem[] = [
  {
    id: "1",
    name: "Pilot School #1",
    subdomain: "pilotschool",
    subdomainHost: "pilotschool.ourlms.com",
    status: "Trial",
    onboarding: {
      branding: true,
      academic: true,
      teachersInvited: true,
      firstLesson: false,
    },
    onboardingLabel: "3 / 4 complete",
    createdDate: "2026-09-10",
  },
  {
    id: "2",
    name: "Monrovia Academy",
    subdomain: "monroviaacademy",
    subdomainHost: "monroviaacademy.ourlms.com",
    status: "Active",
    onboarding: {
      branding: true,
      academic: true,
      teachersInvited: true,
      firstLesson: true,
    },
    onboardingLabel: "4 / 4 complete",
    createdDate: "2026-08-22",
  },
  {
    id: "3",
    name: "St. Paul's Learning Center",
    subdomain: "stpauls",
    subdomainHost: "stpauls.ourlms.com",
    status: "Active",
    onboarding: {
      branding: true,
      academic: true,
      teachersInvited: true,
      firstLesson: true,
    },
    onboardingLabel: "4 / 4 complete",
    createdDate: "2026-07-18",
  },
  {
    id: "4",
    name: "Brewerville Community School",
    subdomain: "brewerville",
    subdomainHost: "brewerville.ourlms.com",
    status: "Suspended",
    onboarding: {
      branding: true,
      academic: true,
      teachersInvited: false,
      firstLesson: false,
    },
    onboardingLabel: "2 / 4 complete",
    createdDate: "2026-06-30",
  },
  {
    id: "5",
    name: "Hope International School",
    subdomain: "hopeintl",
    subdomainHost: "hopeintl.ourlms.com",
    status: "Cancelled",
    onboarding: {
      branding: true,
      academic: false,
      teachersInvited: false,
      firstLesson: false,
    },
    onboardingLabel: "1 / 4 complete",
    createdDate: "2026-05-14",
  },
];

export function getTenants(): TenantsList {
  return {
    eyebrow: "Platform Admin",
    title: "Tenants",
    subtitle: "Manage tenant records and access status.",
    createLabel: "+ Create Tenant",
    statusFilterOptions: ["All", "Trial", "Active", "Suspended", "Cancelled"],
    searchPlaceholder: "Search tenants...",
    suspendLabel: "Suspend",
    exportLabel: "Export",
    tenants: TENANTS,
  };
}
