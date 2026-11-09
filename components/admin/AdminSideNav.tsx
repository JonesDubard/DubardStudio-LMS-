"use client";

import {
  BarChart3,
  GraduationCap,
  LayoutDashboard,
  Palette,
  School,
  Users,
  Files,
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
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    match: (path: string) => path === "/admin/dashboard",
  },
  {
    label: "Setup",
    href: "/admin/branding",
    icon: Palette,
    match: (path: string) => path.startsWith("/admin/branding"),
  },
  {
    label: "People",
    href: "/admin/people/teachers",
    icon: Users,
    match: (path: string) => path.startsWith("/admin/people"),
  },
  {
    label: "Academic",
    href: "/admin/academic",
    icon: GraduationCap,
    match: (path: string) => path.startsWith("/admin/academic"),
  },
  {
    label: "Content",
    href: "/admin/assignments",
    icon: Files,
    match: (path: string) => path.startsWith("/admin/assignments"),
  },
  {
    label: "Usage",
    href: "#",
    icon: BarChart3,
    match: () => false,
  },
];

type AdminSideNavProps = {
  schoolName?: string;
  portalLabel?: string;
};

export function AdminSideNav({
  schoolName = "Pilot School #1",
  portalLabel = "School Admin",
}: AdminSideNavProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-line bg-surface px-4 py-5">
      <div className="mb-8 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-subtle text-brand-primary">
          <School size={18} strokeWidth={1.75} aria-hidden />
        </div>
        <p className="mt-3 text-xs font-medium text-ink-muted">{portalLabel}</p>
        <p className="font-semibold tracking-tight text-ink">{schoolName}</p>
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
