"use client";

import { Building2, LayoutDashboard, ScrollText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { MobileNavBar } from "@/components/shared/MobileNavDrawer";
import { PersonaShell } from "@/components/shared/PersonaShell";
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
    label: "Audit",
    href: "/platform/audit",
    icon: ScrollText,
    match: (path: string) => path.startsWith("/platform/audit"),
  },
];

function PlatformMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.svg" alt="" className="h-10 w-10 rounded-lg object-contain" />
  );
}

export function PlatformSideNav({ children }: { children: ReactNode }) {
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
        <aside className={desktopSideNav} aria-label="Platform">
          <div className="mb-6 flex flex-col items-center lg:mb-8 lg:items-start lg:px-2">
            <PlatformMark />
            <p className={`mt-3 text-xs font-medium text-ink-muted ${navLabel}`}>Platform</p>
            <p className={`font-semibold tracking-tight text-ink ${navLabel}`}>Administration</p>
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
          title="TerraLearn"
          subtitle="Platform"
          renderLogo={() => <PlatformMark />}
          items={items}
        />
      }
    >
      {children}
    </PersonaShell>
  );
}
