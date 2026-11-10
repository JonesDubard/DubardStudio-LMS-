"use client";

import { Award, Home, School, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

  const itemClass =
    "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none md:min-h-11 md:flex-row md:gap-2 md:rounded-lg md:px-3 md:text-sm";

  return (
    <nav
      aria-label="Student"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:top-0 md:bottom-auto md:border-b md:border-t-0 md:pb-0"
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-4 md:flex md:h-14 md:items-center md:gap-1 md:px-8">
        {items.map((item) => {
          const active = item.active(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? `${itemClass} border-t-2 border-brand-primary font-semibold text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring md:border-t-0 md:bg-brand-subtle`
                  : `${itemClass} border-t-2 border-transparent text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring md:border-t-0`
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
  );
}
