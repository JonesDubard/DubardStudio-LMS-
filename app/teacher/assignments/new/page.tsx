import type { Metadata } from "next";
import { AssessmentForm } from "@/components/teacher/AssessmentForm";
import { getAssignmentForEdit } from "@/lib/stubs/get-assignment-for-edit";

export const metadata: Metadata = {
  title: "Create Assignment",
};

export default function NewAssignmentPage() {
  const data = getAssignmentForEdit("new");

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">{data.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.pageTitle}</h1>
        <p className="mt-1 text-sm text-[#666666]">{data.subtitle}</p>
      </header>

      <div className="max-w-4xl p-8">
        <AssessmentForm data={data} />
      </div>
    </main>
  );
}
