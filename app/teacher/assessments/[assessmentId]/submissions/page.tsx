import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { GradeRosterForm } from "@/components/teacher/GradeRosterForm";
import { GradeSubmissionForm } from "@/components/teacher/GradeSubmissionForm";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  getAssessmentDetails,
  getRosterForGradeEntry,
  getSubmissionsForAssessment,
} from "@/lib/queries/assessments";
import { createClient } from "@/lib/supabase/server";
import { surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Grade Assessment",
};

export default async function AssessmentSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ assessmentId: string }>;
  searchParams: Promise<{ submission?: string }>;
}) {
  const { assessmentId } = await params;
  const { submission: selectedId } = await searchParams;
  const supabase = await createClient();
  const assessment = await getAssessmentDetails(supabase, assessmentId);
  if (!assessment) notFound();

  const submissions =
    assessment.type === "assignment"
      ? await getSubmissionsForAssessment(supabase, assessment.id)
      : [];
  const roster =
    assessment.type === "assignment"
      ? []
      : await getRosterForGradeEntry(supabase, assessment.id);
  const selected =
    submissions.find((row) => row.id === selectedId) ?? submissions[0] ?? null;

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium capitalize text-ink-muted">
          {assessment.type} · {assessment.status}
        </p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          {assessment.title}
        </h1>
        {assessment.dueDate ? (
          <p className="mt-1 text-sm text-ink-secondary">
            Due {new Date(assessment.dueDate).toLocaleString("en-GB")}
          </p>
        ) : null}
      </header>

      <div className="p-4 lg:p-8">
        {assessment.type === "assignment" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <section className={surfaceCard}>
              <div className="border-b border-line p-5">
                <h2 className="font-semibold tracking-tight">Submissions</h2>
                <p className="mt-1 text-sm text-ink-secondary">
                  {submissions.length} handed in
                </p>
              </div>
              <div className="divide-y divide-line">
                {submissions.length === 0 ? (
                  <p className="p-5 text-sm text-ink-secondary">No submissions yet.</p>
                ) : (
                  submissions.map((row) => (
                    <Link
                      key={row.id}
                      href={`/teacher/assessments/${assessment.id}/submissions?submission=${row.id}`}
                      className={
                        selected?.id === row.id
                          ? "block border-l-4 border-brand-primary bg-brand-subtle p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
                          : "block p-5 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
                      }
                    >
                      <span className="font-medium">{row.studentName}</span>
                      <p className="mt-2 text-sm text-ink-secondary">
                        {row.releasedAt
                          ? `Released · ${row.score ?? "—"}`
                          : row.score === null
                            ? "Not graded"
                            : `Score ${row.score}`}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </section>
            {selected ? (
              <GradeSubmissionForm
                key={`${selected.id}-${selected.releasedAt ?? ""}`}
                submission={selected}
                maxScore={assessment.maxScore}
              />
            ) : (
              <EmptyState
                icon={Inbox}
                title="Submissions appear here after a student hands in."
              />
            )}
          </div>
        ) : (
          <GradeRosterForm
            key={roster.map((row) => row.releasedAt ?? "").join("|")}
            assessmentId={assessment.id}
            maxScore={assessment.maxScore}
            rows={roster}
          />
        )}
      </div>
    </main>
  );
}
