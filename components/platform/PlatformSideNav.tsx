"use client";

import {
  BarChart3,
  Building2,
  CreditCard,
  LayoutDashboard,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { navLabel, navLink, navLinkActive, sideNavAside } from "@/lib/ui/styles";

const navItems: {
  label: string;
  href: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
}[] = [
  {
    label: "Dashboard",
    href: "/platform/dashboard",
    icon: LayoutDashboard,
    match: (path: string) => path === "/platform/dashboard",
  },
  {
    label: "Tenants",
    href: "/platform/tenants",
    icon: Building2,
    match: (path: string) => path.startsWith("/platform/tenants"),
  },
  {
    label: "Subscriptions",
    href: "#",
    icon: CreditCard,
    match: () => false,
  },
  {
    label: "Usage",
    href: "#",
    icon: BarChart3,
    match: () => false,
  },
  {
    label: "Audit",
    href: "/platform/audit",
    icon: ScrollText,
    match: (path: string) => path.startsWith("/platform/audit"),
  },
];

export function PlatformSideNav() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-line bg-surface px-4 py-6">
      <div className="mb-8 px-2">
        <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Platform Console
        </div>
        <div className="text-lg font-semibold tracking-tight text-ink">
          LMS Administration
        </div>
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
