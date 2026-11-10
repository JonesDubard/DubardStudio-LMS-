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
import { SchoolMark } from "@/components/shared/SchoolMark";
import { navLabel, navLink, navLinkActive, sideNavAside } from "@/lib/ui/styles";

const navItems: {
  label: string;
  href: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
  title?: string;
}[] = [
  {
    label: "Home",
    href: "/teacher/home",
    icon: Home,
    match: (path: string) => path === "/teacher/home",
  },
  {
    label: "Classes",
    href: "#",
    icon: School,
    match: () => false,
    title: "Classes are not available yet",
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
};

export function TeacherSideNav({
  teacherName = "",
  portalLabel = "Teacher Portal",
  logoUrl = null,
}: TeacherSideNavProps) {
  const pathname = usePathname();

  return (
    <aside className={sideNavAside}>
      <div className="mb-6 flex flex-col items-center lg:mb-8 lg:items-start lg:px-2">
        <SchoolMark src={logoUrl} />
        <p className={`mt-3 text-xs font-medium text-ink-muted ${navLabel}`}>{portalLabel}</p>
        {teacherName ? (
          <p className={`font-semibold tracking-tight text-ink ${navLabel}`}>{teacherName}</p>
        ) : null}
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = item.match(pathname);
          const className = active ? navLinkActive : navLink;
          const Icon = item.icon;
          const content = (
            <>
              <Icon size={18} strokeWidth={1.75} aria-hidden />
              <span className={navLabel}>{item.label}</span>
            </>
          );

          if (item.href === "#") {
            return (
              <span
                key={item.label}
                className={className}
                title={item.title ?? item.label}
              >
                {content}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={className}
              title={item.title ?? item.label}
              aria-current={active ? "page" : undefined}
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
