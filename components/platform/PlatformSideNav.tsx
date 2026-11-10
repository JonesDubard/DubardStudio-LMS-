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
  title?: string;
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
    title: "Subscriptions are not available yet",
  },
  {
    label: "Usage",
    href: "#",
    icon: BarChart3,
    match: () => false,
    title: "Usage is not available yet",
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
    <aside className={sideNavAside}>
      <div className="mb-6 flex flex-col items-center lg:mb-8 lg:items-start lg:px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-subtle text-brand-primary">
          <Building2 size={18} strokeWidth={1.75} aria-hidden />
        </div>
        <p className={`mt-3 text-xs font-medium text-ink-muted ${navLabel}`}>Platform</p>
        <p className={`font-semibold tracking-tight text-ink ${navLabel}`}>Administration</p>
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
