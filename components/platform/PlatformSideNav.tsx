"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Dashboard",
    href: "/platform/dashboard",
    match: (path: string) => path === "/platform/dashboard",
  },
  {
    label: "Tenants",
    href: "/platform/tenants",
    match: (path: string) => path.startsWith("/platform/tenants"),
  },
  {
    label: "Subscriptions",
    href: "#",
    match: () => false,
  },
  {
    label: "Usage",
    href: "#",
    match: () => false,
  },
  {
    label: "Audit",
    href: "/platform/audit",
    match: (path: string) => path.startsWith("/platform/audit"),
  },
] as const;

export function PlatformSideNav() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-[#E5E5E5] bg-white p-6">
      <div className="mb-8">
        <div className="mb-1 text-xs uppercase tracking-widest text-[#999999]">
          Platform Console
        </div>
        <div className="text-lg font-semibold">LMS Administration</div>
      </div>

      <nav className="space-y-1 text-sm">
        {navItems.map((item) => {
          const active = item.match(pathname);
          const className = active
            ? "flex items-center gap-3 rounded-md bg-[#E5E5E5] px-3 py-2 font-medium"
            : "flex items-center gap-3 rounded-md px-3 py-2 text-[#666666]";

          const content = (
            <>
              <span className="flex h-5 w-5 items-center justify-center border border-[#999999] text-xs">
                /
              </span>
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
