"use client";

import {
  Files,
  GraduationCap,
  LayoutDashboard,
  Palette,
  Settings,
  Users,
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
  children: ReactNode;
};

export function AdminSideNav({
  schoolName = "School",
  portalLabel = "School Admin",
  logoUrl = null,
  children,
}: AdminSideNavProps) {
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
        <aside className={desktopSideNav} aria-label="School Admin">
          <div className="mb-6 flex flex-col items-center lg:mb-8 lg:items-start lg:px-2">
            <SchoolMark src={logoUrl} />
            <p className={`mt-3 text-xs font-medium text-ink-muted ${navLabel}`}>{portalLabel}</p>
            <p className={`font-semibold tracking-tight text-ink ${navLabel}`}>{schoolName}</p>
          </div>
          <DesktopLinks items={items} />
          <div className="mt-4 shrink-0 border-t border-line pt-3">
            <SignOutButton />
          </div>
        </aside>
      }
      mobile={
        <MobileNavBar
          title={schoolName}
          subtitle={portalLabel}
          renderLogo={() => <SchoolMark src={logoUrl} />}
          items={items}
        />
      }
    >
      {children}
    </PersonaShell>
  );
}

function DesktopLinks({
  items,
}: {
  items: { label: string; href: string; icon: LucideIcon; active: boolean }[];
}) {
  return (
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
  );
}
