import type { Metadata } from "next";
import Link from "next/link";
import { AcademicSetupStepCard } from "@/components/admin/AcademicSetupStepCard";
import { AcademicSubNav } from "@/components/admin/AcademicSubNav";
import {
  academicYearStatus,
  classNamesBySubjectId,
  getAcademicYears,
  getClasses,
  getClassSubjects,
  getSubjects,
  getTerms,
  termStatus,
} from "@/lib/queries/academic";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Academic Setup",
};

const steps = [
  {
    id: "years",
    number: "1",
    label: "Academic Years",
    href: "/admin/academic/years",
  },
  { id: "terms", number: "2", label: "Terms", href: "/admin/academic/terms" },
  {
    id: "classes",
    number: "3",
    label: "Classes",
    href: "/admin/academic/classes",
  },
  {
    id: "subjects",
    number: "4",
    label: "Subjects",
    href: "/admin/academic/subjects",
  },
] as const;

function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: string;
}) {
  return (
    <tr>
      <td className="px-4 py-6 text-sm text-[#666666]" colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}

export default async function AdminAcademicPage() {
  const supabase = await createClient();
  const [years, classes, subjects] = await Promise.all([
    getAcademicYears(supabase),
    getClasses(supabase),
    getSubjects(supabase),
  ]);
  const currentYear = years.find((year) => year.is_current) ?? null;
  const [terms, linkGroups] = await Promise.all([
    currentYear ? getTerms(supabase, currentYear.id) : Promise.resolve([]),
    Promise.all(classes.map((row) => getClassSubjects(supabase, row.id))),
  ]);
  const classesBySubject = classNamesBySubjectId(classes, linkGroups.flat());
  const filled = {
    years: years.length > 0,
    terms: terms.length > 0,
    classes: classes.length > 0,
    subjects: subjects.length > 0,
  };

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">Academic / Setup</p>
        <h1 className="mt-1 text-2xl font-semibold">Academic Setup</h1>
        <p className="mt-1 text-sm text-[#666666]">
          Configure the academic structure for the school.
        </p>
      </header>

      <div className="space-y-6 p-8">
        <AcademicSubNav />

        <section className="border border-[#999999] bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#666666]">Setup Progress</p>
              <p className="mt-1 font-semibold">Academic Structure</p>
            </div>
          </div>

          <div className="mt-5 flex items-center">
            {steps.map((step, index) => {
              const active = filled[step.id];
              return (
                <div key={step.id} className="contents">
                  {index > 0 ? (
                    <div className="w-12 border-t border-[#999999]" />
                  ) : null}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={
                          active
                            ? "flex h-8 w-8 items-center justify-center bg-[#333333] text-sm text-white"
                            : "flex h-8 w-8 items-center justify-center border border-[#999999] bg-[#E5E5E5] text-sm"
                        }
                      >
                        {step.number}
                      </span>
                      <Link href={step.href} className="font-medium">
                        {step.label}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <AcademicSetupStepCard
            title="Academic Years"
            description="School academic years."
            href="/admin/academic/years"
          >
            <table className="w-full text-sm">
              <thead className="bg-[#E5E5E5] text-left">
                <tr>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {years.length === 0 ? (
                  <EmptyRow colSpan={2}>No academic years yet.</EmptyRow>
                ) : (
                  years.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">{academicYearStatus(row)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </AcademicSetupStepCard>

          <AcademicSetupStepCard
            title="Terms"
            description="Terms within the current year."
            href="/admin/academic/terms"
          >
            <table className="w-full text-sm">
              <thead className="bg-[#E5E5E5] text-left">
                <tr>
                  <th className="px-4 py-3">Term</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {terms.length === 0 ? (
                  <EmptyRow colSpan={2}>
                    {currentYear
                      ? "No terms for the current academic year."
                      : "No current academic year."}
                  </EmptyRow>
                ) : (
                  terms.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">{termStatus(row)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </AcademicSetupStepCard>

          <AcademicSetupStepCard
            title="Classes"
            description="Classes and grade levels."
            href="/admin/academic/classes"
          >
            <table className="w-full text-sm">
              <thead className="bg-[#E5E5E5] text-left">
                <tr>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {classes.length === 0 ? (
                  <EmptyRow colSpan={2}>No classes yet.</EmptyRow>
                ) : (
                  classes.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">—</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </AcademicSetupStepCard>

          <AcademicSetupStepCard
            title="Subjects"
            description="Subjects available to classes."
            href="/admin/academic/subjects"
          >
            <table className="w-full text-sm">
              <thead className="bg-[#E5E5E5] text-left">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Classes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {subjects.length === 0 ? (
                  <EmptyRow colSpan={2}>No subjects yet.</EmptyRow>
                ) : (
                  subjects.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">
                        {classesBySubject.get(row.id)?.join(", ") || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </AcademicSetupStepCard>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="border border-[#333333] bg-[#333333] px-5 py-3 text-white"
          >
            Save Academic Structure
          </button>
        </div>
      </div>
    </main>
  );
}
