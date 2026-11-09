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

  const itemClass = "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium";

  return (
    <nav className="fixed bottom-0 left-1/2 z-10 w-full max-w-[390px] -translate-x-1/2 border-t border-line bg-surface">
      <div className="grid grid-cols-3">
        <Link
          href="/feed"
          className={
            homeActive
              ? `${itemClass} border-t-2 border-brand-primary font-semibold text-brand-primary`
              : `${itemClass} border-t-2 border-transparent text-ink-muted`
          }
          aria-current={homeActive ? "page" : undefined}
        >
          <Home size={18} strokeWidth={1.75} aria-hidden />
          <span>Home</span>
        </Link>

        <div className={`${itemClass} text-ink-muted`}>
          <School size={18} strokeWidth={1.75} aria-hidden />
          <span>Classes</span>
        </div>

        <div className={`${itemClass} text-ink-muted`}>
          <Award size={18} strokeWidth={1.75} aria-hidden />
          <span>Grades</span>
        </div>
      </div>
    </nav>
  );
}
