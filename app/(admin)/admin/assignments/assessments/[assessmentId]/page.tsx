import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminAssessment } from "@/lib/queries/admin-content";
import { createClient } from "@/lib/supabase/server";
import { buttonSecondary } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Assessment",
};

function formatDue(value: string | null): string {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminAssessmentPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const supabase = await createClient();
  const assessment = await getAdminAssessment(supabase, assessmentId);
  if (!assessment) notFound();

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 md:px-8 md:py-6">
        <p className="text-xs font-medium capitalize text-ink-muted">
          Content / {assessment.type} · {assessment.status}
        </p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          {assessment.title}
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {assessment.className} · {assessment.subjectName}
        </p>
      </header>
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-8">
        <p className="text-sm text-ink-secondary">
          Due {formatDue(assessment.dueDate)}
          {assessment.maxScore !== null ? ` · ${assessment.maxScore} points` : ""}
        </p>
        <section className="max-w-prose space-y-2">
          <h2 className="text-sm font-semibold tracking-tight text-ink">Instructions</h2>
          <p className="whitespace-pre-wrap text-base leading-7 text-ink">
            {assessment.instructions?.trim() || "No instructions."}
          </p>
        </section>
        <Link href="/admin/assignments" className={`${buttonSecondary} w-full sm:w-auto`}>
          Back to content
        </Link>
      </div>
    </main>
  );
}
