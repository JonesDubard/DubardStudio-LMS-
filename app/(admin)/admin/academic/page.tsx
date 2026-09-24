import type { Metadata } from "next";
import { AcademicSetupStepCard } from "@/components/admin/AcademicSetupStepCard";
import { getAcademicStructure } from "@/lib/stubs/get-academic-structure";

export const metadata: Metadata = {
  title: "Academic Setup",
};

export default function AdminAcademicPage() {
  const data = getAcademicStructure();

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">{data.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.title}</h1>
        <p className="mt-1 text-sm text-[#666666]">{data.subtitle}</p>
      </header>

      <div className="space-y-6 p-8">
        <section className="border border-[#999999] bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#666666]">{data.progressEyebrow}</p>
              <p className="mt-1 font-semibold">{data.progressTitle}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center">
            {data.progressSteps.map((step, index) => (
              <div key={step.id} className="contents">
                {index > 0 ? (
                  <div className="w-12 border-t border-[#999999]" />
                ) : null}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        step.active
                          ? "flex h-8 w-8 items-center justify-center bg-[#333333] text-sm text-white"
                          : "flex h-8 w-8 items-center justify-center border border-[#999999] bg-[#E5E5E5] text-sm"
                      }
                    >
                      {step.number}
                    </span>
                    <span className="font-medium">{step.label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <AcademicSetupStepCard
            title="Academic Years"
            description="School academic years."
          >
            <table className="w-full text-sm">
              <thead className="bg-[#E5E5E5] text-left">
                <tr>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {data.years.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{row.year}</td>
                    <td className="px-4 py-3">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AcademicSetupStepCard>

          <AcademicSetupStepCard
            title="Terms"
            description="Terms within the current year."
          >
            <table className="w-full text-sm">
              <thead className="bg-[#E5E5E5] text-left">
                <tr>
                  <th className="px-4 py-3">Term</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {data.terms.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{row.term}</td>
                    <td className="px-4 py-3">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AcademicSetupStepCard>

          <AcademicSetupStepCard
            title="Classes"
            description="Classes and grade levels."
          >
            <table className="w-full text-sm">
              <thead className="bg-[#E5E5E5] text-left">
                <tr>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {data.classes.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">{row.students}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AcademicSetupStepCard>

          <AcademicSetupStepCard
            title="Subjects"
            description="Subjects available to classes."
          >
            <table className="w-full text-sm">
              <thead className="bg-[#E5E5E5] text-left">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Classes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {data.subjects.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">{row.classes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AcademicSetupStepCard>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="border border-[#333333] bg-[#333333] px-5 py-3 text-white"
          >
            {data.saveLabel}
          </button>
        </div>
      </div>
    </main>
  );
}
