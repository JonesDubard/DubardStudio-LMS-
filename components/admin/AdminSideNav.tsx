"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    match: (path: string) => path === "/admin/dashboard",
  },
  {
    label: "Setup",
    href: "/admin/branding",
    match: (path: string) => path.startsWith("/admin/branding"),
  },
  {
    label: "People",
    href: "/admin/people/teachers",
    match: (path: string) => path.startsWith("/admin/people"),
  },
  {
    label: "Academic",
    href: "/admin/academic",
    match: (path: string) => path.startsWith("/admin/academic"),
  },
  {
    label: "Content",
    href: "/admin/assignments",
    match: (path: string) => path.startsWith("/admin/assignments"),
  },
  {
    label: "Usage",
    href: "#",
    match: () => false,
  },
] as const;

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
    <aside className="w-64 shrink-0 border-r border-[#999999] bg-white p-5">
      <div className="mb-8">
        <div className="flex h-10 w-10 items-center justify-center border border-[#999999] bg-[#E5E5E5] text-[#666666]">
          /
        </div>
        <p className="mt-3 text-sm text-[#666666]">{portalLabel}</p>
        <p className="font-semibold">{schoolName}</p>
      </div>

      <nav className="space-y-1 text-sm">
        {navItems.map((item) => {
          const active = item.match(pathname);
          const className = active
            ? "block rounded border border-[#333333] bg-[#E5E5E5] px-4 py-3 font-semibold"
            : "block px-4 py-3";

          if (item.href === "#") {
            return (
              <span key={item.label} className={className}>
                {item.label}
              </span>
            );
          }

          return (
            <Link key={item.label} href={item.href} className={className}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
