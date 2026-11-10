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
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium text-ink-muted">{data.eyebrow}</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          {data.pageTitle}
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">{data.subtitle}</p>
      </header>

      <div className="max-w-4xl p-4 lg:p-8">
        <AssessmentForm data={data} />
      </div>
    </main>
  );
}
