export interface SetupProgressItem {
  id: string;
  title: string;
  description: string;
  complete: boolean;
}

export interface SummaryTile {
  id: string;
  label: string;
  value: string;
  detail: string;
}

export interface UsageMetric {
  id: string;
  label: string;
  value: string;
}

export interface AdminDashboard {
  schoolName: string;
  portalLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  setupTitle: string;
  setupDescription: string;
  setupProgressLabel: string;
  setupItems: SetupProgressItem[];
  overviewTitle: string;
  summaryTiles: SummaryTile[];
  usageTitle: string;
  usageDescription: string;
  usageActionLabel: string;
  usageMetrics: UsageMetric[];
}

export function getAdminDashboard(): AdminDashboard {
  return {
    schoolName: "Pilot School #1",
    portalLabel: "School Admin",
    eyebrow: "School Administration",
    title: "Dashboard",
    subtitle: "Pilot School #1 · Academic Year 2026/2027",
    setupTitle: "Setup Progress",
    setupDescription: "Complete the school setup before inviting all users.",
    setupProgressLabel: "2 OF 4 COMPLETE",
    setupItems: [
      {
        id: "branding",
        title: "Branding",
        description: "School branding configured.",
        complete: true,
      },
      {
        id: "academic",
        title: "Academic Structure",
        description: "Year, terms, classes and subjects configured.",
        complete: true,
      },
      {
        id: "teachers",
        title: "Teachers Invited",
        description: "3 teachers still need invitations.",
        complete: false,
      },
      {
        id: "students",
        title: "Students Invited",
        description: "32 students still need invitations.",
        complete: false,
      },
    ],
    overviewTitle: "School Overview",
    summaryTiles: [
      {
        id: "teachers",
        label: "Teachers",
        value: "6",
        detail: "3 active · 3 invited",
      },
      {
        id: "students",
        label: "Students",
        value: "64",
        detail: "32 active · 32 invited",
      },
      {
        id: "lessons",
        label: "Published Lessons",
        value: "24",
        detail: "Across 5 classes",
      },
      {
        id: "assignments",
        label: "Assignments",
        value: "18",
        detail: "7 upcoming · 11 past",
      },
    ],
    usageTitle: "Basic Usage",
    usageDescription: "Current school activity.",
    usageActionLabel: "View Usage",
    usageMetrics: [
      {
        id: "lessons-term",
        label: "Lessons Published This Term",
        value: "24",
      },
      {
        id: "assignments-created",
        label: "Assignments Created",
        value: "18",
      },
      {
        id: "active-students",
        label: "Active Students",
        value: "32",
      },
    ],
  };
}
