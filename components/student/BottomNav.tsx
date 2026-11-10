"use client";

import { Award, Home, School } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();
  const homeActive =
    pathname === "/feed" ||
    pathname.startsWith("/lessons") ||
    pathname.startsWith("/assignments");

  const itemClass =
    "flex min-h-16 flex-col items-center justify-center gap-1 px-2 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none md:min-h-11 md:flex-row md:gap-2 md:rounded-lg md:px-3 md:text-sm";

  const homeClass = homeActive
    ? `${itemClass} border-t-2 border-brand-primary font-semibold text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring md:border-t-0 md:bg-brand-subtle`
    : `${itemClass} border-t-2 border-transparent text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring md:border-t-0`;

  const inertClass = `${itemClass} cursor-default border-t-2 border-transparent text-ink-muted md:border-t-0`;

  return (
    <nav
      aria-label="Student"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:top-0 md:bottom-auto md:border-b md:border-t-0 md:pb-0"
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-3 md:flex md:h-14 md:items-center md:gap-1 md:px-8">
        <Link
          href="/feed"
          className={homeClass}
          aria-current={homeActive ? "page" : undefined}
        >
          <Home size={18} strokeWidth={1.75} aria-hidden />
          <span>Home</span>
        </Link>

        <div className={inertClass} title="Classes are not available yet">
          <School size={18} strokeWidth={1.75} aria-hidden />
          <span>Classes</span>
        </div>

        <div className={inertClass} title="Grades are not available yet">
          <Award size={18} strokeWidth={1.75} aria-hidden />
          <span>Grades</span>
        </div>
      </div>
    </nav>
  );
}
