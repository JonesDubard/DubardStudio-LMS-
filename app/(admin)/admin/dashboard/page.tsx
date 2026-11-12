import type { Metadata } from "next";
import Link from "next/link";
import { Files, GraduationCap, Palette, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { readShellBrand } from "@/lib/branding/shell";
import {
  getAcademicYears,
  getClasses,
  getSubjects,
  getTerms,
} from "@/lib/queries/academic";
import { createClient } from "@/lib/supabase/server";
import { surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "School Admin Dashboard",
};

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

const areas: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/admin/branding",
    title: "Branding",
    description: "School name and colours.",
    icon: Palette,
  },
  {
    href: "/admin/people/teachers",
    title: "People",
    description: "Teachers, students, admins, and parents.",
    icon: Users,
  },
  {
    href: "/admin/academic",
    title: "Academic",
    description: "Years, terms, classes, and subjects.",
    icon: GraduationCap,
  },
  {
    href: "/admin/assignments",
    title: "Content",
    description: "Assignments across the school.",
    icon: Files,
  },
];

export default async function AdminDashboardPage() {
  const brand = await readShellBrand();
  const supabase = await createClient();
  const [years, classes, subjects] = await Promise.all([
    getAcademicYears(supabase),
    getClasses(supabase),
    getSubjects(supabase),
  ]);
  const currentYear = years.find((year) => year.is_current) ?? null;
  const terms = currentYear ? await getTerms(supabase, currentYear.id) : [];
  const schoolName = brand.schoolName ?? "School";

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1 shrink-0 rounded-full bg-brand-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              School Administration
            </p>
            <h1 className="mt-1 break-words text-xl font-semibold tracking-tight text-ink md:text-2xl">
              {schoolName}
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {countLabel(years.length, "academic year", "academic years")} ·{" "}
              {countLabel(terms.length, "term", "terms")} in the current year ·{" "}
              {countLabel(classes.length, "class", "classes")} ·{" "}
              {countLabel(subjects.length, "subject", "subjects")}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-8 p-4 lg:p-8">
        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">School setup</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Open the area you need to manage.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {areas.map((area) => {
              const Icon = area.icon;
              return (
                <Link
                  key={area.href}
                  href={area.href}
                  className={`${surfaceCard} block p-5 hover:border-brand-border hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-subtle text-brand-primary">
                    <Icon size={18} strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-semibold tracking-tight text-ink">
                    {area.title}
                  </h3>
                  <p className="mt-1 text-sm text-ink-secondary">{area.description}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
