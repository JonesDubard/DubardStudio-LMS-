"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();
  const homeActive =
    pathname === "/feed" ||
    pathname.startsWith("/lessons") ||
    pathname.startsWith("/assignments");

  return (
    <nav className="fixed bottom-0 left-1/2 z-10 w-full max-w-[390px] -translate-x-1/2 border-t border-[#999999] bg-white">
      <div className="grid grid-cols-3">
        <Link
          href="/feed"
          className={
            homeActive
              ? "flex min-h-16 flex-col items-center justify-center border-t-4 border-brand-secondary bg-brand-primary text-white"
              : "flex min-h-16 flex-col items-center justify-center text-[#666666]"
          }
          aria-current={homeActive ? "page" : undefined}
        >
          <span className="text-sm font-bold">Home</span>
          {homeActive ? (
            <span className="mt-1 text-[10px]">Current</span>
          ) : null}
        </Link>

        <div className="flex min-h-16 flex-col items-center justify-center text-[#666666]">
          <span className="text-sm font-semibold">Classes</span>
        </div>

        <div className="flex min-h-16 flex-col items-center justify-center text-[#666666]">
          <span className="text-sm font-semibold">Grades</span>
        </div>
      </div>
    </nav>
  );
}
