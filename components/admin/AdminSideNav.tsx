"use client";

import {
  GraduationCap,
  LayoutDashboard,
  Palette,
  Settings,
  Users,
  Files,
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
    label: "Settings",
    href: "/settings",
    icon: Settings,
    match: (path: string) => path.startsWith("/settings"),
  },
];

type AdminSideNavProps = {
  schoolName?: string;
  portalLabel?: string;
  logoUrl?: string | null;
};

export function AdminSideNav({
  schoolName = "Pilot School #1",
  portalLabel = "School Admin",
  logoUrl = null,
}: AdminSideNavProps) {
  const pathname = usePathname();

  return (
    <aside className={sideNavAside}>
      <div className="mb-6 flex flex-col items-center lg:mb-8 lg:items-start lg:px-2">
        <SchoolMark src={logoUrl} />
        <p className={`mt-3 text-xs font-medium text-ink-muted ${navLabel}`}>{portalLabel}</p>
        <p className={`font-semibold tracking-tight text-ink ${navLabel}`}>{schoolName}</p>
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
              <span key={item.label} className={className} title={item.title ?? item.label}>
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
