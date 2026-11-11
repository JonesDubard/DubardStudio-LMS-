"use client";

import {
  BookOpen,
  CheckCheck,
  ClipboardList,
  Home,
  School,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { MobileNavBar } from "@/components/shared/MobileNavDrawer";
import { PersonaShell } from "@/components/shared/PersonaShell";
import { SchoolMark } from "@/components/shared/SchoolMark";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { desktopSideNav, navLabel, navLink, navLinkActive } from "@/lib/ui/styles";

const navItems: {
  label: string;
  href: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
}[] = [
  {
    label: "Home",
    href: "/teacher/home",
    icon: Home,
    match: (path: string) => path === "/teacher/home",
  },
  {
    label: "Classes",
    href: "/teacher/classes",
    icon: School,
    match: (path: string) => path.startsWith("/teacher/classes"),
  },
  {
    label: "Lessons",
    href: "/teacher/lessons",
    icon: BookOpen,
    match: (path: string) => path.startsWith("/teacher/lessons"),
  },
  {
    label: "Assignments",
    href: "/teacher/assignments",
    icon: ClipboardList,
    match: (path: string) =>
      path.startsWith("/teacher/assignments") && !path.includes("/submissions"),
  },
  {
    label: "Grading",
    href: "/teacher/grading",
    icon: CheckCheck,
    match: (path: string) =>
      path.startsWith("/teacher/grading") ||
      path.includes("/submissions") ||
      path.includes("/grade-entry"),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    match: (path: string) => path.startsWith("/settings"),
  },
];

type TeacherSideNavProps = {
  teacherName?: string;
  portalLabel?: string;
  logoUrl?: string | null;
  children: ReactNode;
};

export function TeacherSideNav({
  teacherName = "",
  portalLabel = "Teacher Portal",
  logoUrl = null,
  children,
}: TeacherSideNavProps) {
  const pathname = usePathname();
  const items = navItems.map((item) => ({
    label: item.label,
    href: item.href,
    icon: item.icon,
    active: item.match(pathname),
  }));

  return (
    <PersonaShell
      sidebar={
        <aside className={desktopSideNav} aria-label="Teacher">
          <div className="mb-6 flex flex-col items-center lg:mb-8 lg:items-start lg:px-2">
            <SchoolMark src={logoUrl} />
            <p className={`mt-3 text-xs font-medium text-ink-muted ${navLabel}`}>{portalLabel}</p>
            {teacherName ? (
              <p className={`font-semibold tracking-tight text-ink ${navLabel}`}>{teacherName}</p>
            ) : null}
          </div>
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={item.active ? navLinkActive : navLink}
                  title={item.label}
                  aria-current={item.active ? "page" : undefined}
                >
                  <Icon size={18} strokeWidth={1.75} aria-hidden />
                  <span className={navLabel}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 shrink-0 border-t border-line pt-3">
            <SignOutButton />
          </div>
        </aside>
      }
      mobile={
        <MobileNavBar
          title={teacherName || portalLabel}
          subtitle={teacherName ? portalLabel : undefined}
          renderLogo={() => <SchoolMark src={logoUrl} />}
          items={items}
        />
      }
    >
      {children}
    </PersonaShell>
  );
}
