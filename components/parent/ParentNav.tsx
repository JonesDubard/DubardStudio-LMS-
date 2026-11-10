"use client";

import { Award, ClipboardList, Home, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { navLabel, navLink, navLinkActive, sideNavAside } from "@/lib/ui/styles";

const items = [
  { href: "/parent/home", label: "Home", icon: Home },
  { href: "/parent/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/parent/grades", label: "Grades", icon: Award },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function ParentNav() {
  const pathname = usePathname();
  const child = useSearchParams().get("child");

  const dockClass =
    "flex min-h-16 flex-col items-center justify-center gap-1 px-2 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none";

  function hrefFor(href: string) {
    return child ? `${href}?child=${encodeURIComponent(child)}` : href;
  }

  function isActive(href: string) {
    return href === "/parent/home" ? pathname === "/parent/home" : pathname.startsWith(href);
  }

  return (
    <>
      <aside className={`${sideNavAside} max-md:hidden`} aria-label="Parent">
        <div className="mb-6 flex flex-col items-center lg:mb-8 lg:items-start lg:px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-subtle text-brand-primary">
            <Home size={18} strokeWidth={1.75} aria-hidden />
          </div>
          <p className={`mt-3 text-xs font-medium text-ink-muted ${navLabel}`}>Parent</p>
        </div>
        <nav className="space-y-1">
          {items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={hrefFor(item.href)}
                className={active ? navLinkActive : navLink}
                title={item.label}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden />
                <span className={navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav
        aria-label="Parent"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto grid w-full grid-cols-4">
          {items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={hrefFor(item.href)}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? `${dockClass} border-t-2 border-brand-primary font-semibold text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring`
                    : `${dockClass} border-t-2 border-transparent text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring`
                }
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
