"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Overview", href: "/admin/academic" },
  { label: "Years", href: "/admin/academic/years" },
  { label: "Terms", href: "/admin/academic/terms" },
  { label: "Classes", href: "/admin/academic/classes" },
  { label: "Subjects", href: "/admin/academic/subjects" },
] as const;

export function AcademicSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Academic setup">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "inline-flex min-h-11 items-center rounded-lg border border-brand-border bg-brand-subtle px-3 py-2 text-sm font-semibold text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
                : "inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-secondary transition-colors duration-150 hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
            }
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
