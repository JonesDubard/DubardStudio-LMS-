"use client";

import {
  BookOpen,
  CheckCheck,
  ClipboardList,
  Home,
  School,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { navLink, navLinkActive } from "@/lib/ui/styles";

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
  { label: "Classes", href: "#", icon: School, match: () => false },
  {
    label: "Lessons",
    href: "/teacher/lessons",
    icon: BookOpen,
    match: (path: string) => path.startsWith("/teacher/lessons"),
  },
  {
    label: "Assignments",
    href: "/teacher/assignments/new",
    icon: ClipboardList,
    match: (path: string) =>
      path.startsWith("/teacher/assignments") && !path.includes("/submissions"),
  },
  {
    label: "Grading",
    href: "/teacher/assignments/1/submissions",
    icon: CheckCheck,
    match: (path: string) =>
      path.includes("/submissions") || path.includes("/grade-entry"),
  },
];

type TeacherSideNavProps = {
  teacherName?: string;
  portalLabel?: string;
};

export function TeacherSideNav({
  teacherName = "Mrs. Sarah Johnson",
  portalLabel = "Teacher Portal",
}: TeacherSideNavProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-line bg-surface px-4 py-5">
      <div className="mb-8 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-subtle text-brand-primary">
          <School size={18} strokeWidth={1.75} aria-hidden />
        </div>
        <p className="mt-3 text-xs font-medium text-ink-muted">{portalLabel}</p>
        <p className="font-semibold tracking-tight text-ink">{teacherName}</p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = item.match(pathname);
          const className = active ? navLinkActive : navLink;
          const Icon = item.icon;
          const content = (
            <>
              <Icon size={18} strokeWidth={1.75} aria-hidden />
              {item.label}
            </>
          );

          if (item.href === "#") {
            return (
              <span key={item.label} className={className}>
                {content}
              </span>
            );
          }

          return (
            <Link key={item.label} href={item.href} className={className}>
              {content}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
