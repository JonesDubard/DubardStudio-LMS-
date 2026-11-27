"use client";

import { Award, BookOpen, ClipboardList, Home, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NavIconBadge } from "@/components/shared/NavIconBadge";
import { SchoolMark } from "@/components/shared/SchoolMark";
import { SignOutButton } from "@/components/shared/SignOutButton";
import {
  navLabel,
  navLink,
  navLinkActive,
  sideNavAside,
} from "@/lib/ui/styles";

const items = [
  { href: "/parent/home", label: "Home", icon: Home },
  { href: "/parent/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/parent/library", label: "Library", icon: BookOpen },
  { href: "/parent/grades", label: "Grades", icon: Award },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function ParentNav({
  schoolName = "School",
  logoUrl = null,
}: {
  schoolName?: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const child = useSearchParams().get("child");

  const dockClass =
    "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors duration-200 motion-reduce:transition-none";

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
          <SchoolMark src={logoUrl} schoolName={schoolName} />
          <p className={`mt-3 text-xs font-medium text-ink-muted ${navLabel}`}>Parent</p>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={hrefFor(item.href)}
                className={active ? navLinkActive : navLink}
                title={item.label}
                aria-current={active ? "page" : undefined}
              >
                <NavIconBadge icon={item.icon} active={active} />
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
        aria-label="Parent"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-md md:hidden"
      >
        <div className="mx-auto grid w-full grid-cols-5">
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
                    ? `${dockClass} font-semibold text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring`
                    : `${dockClass} text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring`
                }
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    active
                      ? "bg-brand-primary/10 text-brand-primary"
                      : "text-ink-muted"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.75} aria-hidden />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
