"use client";

import { Award, Home, School, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { navLabel, navLink, navLinkActive, sideNavAside } from "@/lib/ui/styles";

const items = [
  {
    href: "/feed",
    label: "Home",
    icon: Home,
    active: (path: string) =>
      path === "/feed" ||
      path.startsWith("/lessons") ||
      path.startsWith("/assignments"),
  },
  {
    href: "/classes",
    label: "Classes",
    icon: School,
    active: (path: string) => path.startsWith("/classes"),
  },
  {
    href: "/grades",
    label: "Grades",
    icon: Award,
    active: (path: string) => path.startsWith("/grades"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    active: (path: string) => path.startsWith("/settings"),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const dockClass =
    "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors duration-200 motion-reduce:transition-none";

  return (
    <>
      <aside className={`${sideNavAside} max-md:hidden`} aria-label="Student">
        <div className="mb-6 flex flex-col items-center lg:mb-8 lg:items-start lg:px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-subtle text-brand-primary">
            <School size={18} strokeWidth={1.75} aria-hidden />
          </div>
          <p className={`mt-3 text-xs font-medium text-ink-muted ${navLabel}`}>Student</p>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = item.active(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
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
        <div className="mt-4 shrink-0 border-t border-line pt-3">
          <SignOutButton />
        </div>
      </aside>

      <nav
        aria-label="Student"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto grid w-full grid-cols-4">
          {items.map((item) => {
            const active = item.active(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? `${dockClass} border-t-2 border-brand-primary font-semibold text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring`
                    : `${dockClass} border-t-2 border-transparent text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring`
                }
                aria-current={active ? "page" : undefined}
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
