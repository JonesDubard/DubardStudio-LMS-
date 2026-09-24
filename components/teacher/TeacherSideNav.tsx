"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Home",
    href: "/teacher/home",
    match: (path: string) => path === "/teacher/home",
  },
  { label: "Classes", href: "#", match: () => false },
  {
    label: "Lessons",
    href: "/teacher/lessons/new",
    match: (path: string) => path.startsWith("/teacher/lessons"),
  },
  {
    label: "Assignments",
    href: "/teacher/assignments/new",
    match: (path: string) =>
      path.startsWith("/teacher/assignments") && !path.includes("/submissions"),
  },
  {
    label: "Grading",
    href: "/teacher/assignments/1/submissions",
    match: (path: string) =>
      path.includes("/submissions") || path.includes("/grade-entry"),
  },
] as const;

type TeacherSideNavProps = {
  teacherName?: string;
  portalLabel?: string;
};

export function TeacherSideNav({
  teacherName = "Mrs. Sarah Johnson",
  portalLabel = "Teacher Portal",
}: TeacherSideNavProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-[#999999] bg-white p-5">
      <div className="mb-8">
        <div className="flex h-10 w-10 items-center justify-center border border-[#999999] bg-[#E5E5E5] text-[#666666]">
          /
        </div>
        <p className="mt-3 text-sm text-[#666666]">{portalLabel}</p>
        <p className="font-semibold">{teacherName}</p>
      </div>

      <nav className="space-y-1 text-sm">
        {navItems.map((item) => {
          const active = item.match(pathname);
          const className = active
            ? "block rounded border border-[#333333] bg-[#E5E5E5] px-4 py-3 font-semibold"
            : "block rounded px-4 py-3";

          if (item.href === "#") {
            return (
              <span key={item.label} className={className}>
                {item.label}
              </span>
            );
          }

          return (
            <Link key={item.label} href={item.href} className={className}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
