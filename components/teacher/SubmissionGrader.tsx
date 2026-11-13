"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import { GradeSubmissionForm } from "@/components/teacher/GradeSubmissionForm";
import { EmptyState } from "@/components/shared/EmptyState";
import type { SubmissionGradeView } from "@/lib/types/assessments";
import { surfaceCard } from "@/lib/ui/styles";

export function SubmissionGrader({
  submissions,
  maxScore,
  initialSelectedId,
}: {
  submissions: SubmissionGradeView[];
  maxScore: number | null;
  initialSelectedId?: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    submissions.some((row) => row.id === initialSelectedId) ? (initialSelectedId ?? null) : null,
  );
  const selected = submissions.find((row) => row.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    const panel = document.getElementById("grade-panel");
    if (!panel) return;
    if (window.matchMedia("(max-width: 1023px)").matches) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedId]);

  function select(id: string) {
    setSelectedId(id);
    router.replace(`?submission=${id}`, { scroll: false });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section className={surfaceCard}>
        <div className="border-b border-line p-5">
          <h2 className="font-semibold tracking-tight">Submissions</h2>
          <p className="mt-1 text-sm text-ink-secondary">{submissions.length} handed in</p>
        </div>
        <div className="divide-y divide-line">
          {submissions.length === 0 ? (
            <p className="p-5 text-sm text-ink-secondary">No submissions yet.</p>
          ) : (
            submissions.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => select(row.id)}
                className={
                  selected?.id === row.id
                    ? "block w-full border-l-4 border-brand-primary bg-brand-subtle p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
                    : "block w-full p-5 text-left hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
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
              </button>
            ))
          )}
        </div>
      </section>
      <div id="grade-panel">
        {selected ? (
          <GradeSubmissionForm
            key={`${selected.id}-${selected.releasedAt ?? ""}-${selected.score ?? ""}`}
            submission={selected}
            maxScore={maxScore}
          />
        ) : (
          <EmptyState icon={Inbox} title="Select a student to grade their work." />
        )}
      </div>
    </div>
  );
}
