"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Teachers", href: "/admin/people/teachers" },
  { label: "Students", href: "/admin/people/students" },
  { label: "Admins", href: "/admin/people/admins" },
  { label: "Parents", href: "/admin/people/parents" },
] as const;

export function PeopleSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="People sections">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "rounded-lg border border-brand-border bg-brand-subtle px-3 py-2 text-sm font-semibold text-brand-primary"
                : "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-secondary transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
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
