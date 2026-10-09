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
                ? "border border-[#333333] bg-[#E5E5E5] px-3 py-2 text-sm font-semibold"
                : "border border-[#999999] bg-white px-3 py-2 text-sm"
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
