"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveGrades } from "@/lib/queries/assessments";
import type { GradeRosterRow } from "@/lib/types/assessments";
import { alertError, buttonPrimary, buttonSecondary, fieldControl, fieldControlBase, surfaceCard } from "@/lib/ui/styles";

export function GradeRosterForm({
  assessmentId,
  maxScore,
  rows: initialRows,
}: {
  assessmentId: string;
  maxScore: number | null;
  rows: GradeRosterRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update(studentId: string, field: "score" | "feedback", value: string) {
    setRows((current) =>
      current.map((row) =>
        row.studentId === studentId ? { ...row, [field]: value } : row,
      ),
    );
  }

  async function save(release: boolean) {
    setError(null);
    setPending(true);
    const result = await saveGrades(
      assessmentId,
      rows.map((row) => ({
        studentId: row.studentId,
        score: row.score,
        feedback: row.feedback,
      })),
      release,
    );
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className={surfaceCard}>
      <div className="border-b border-line p-5">
        <h2 className="font-semibold tracking-tight text-ink">Grade entry</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          One row per enrolled student. There is no digital submission.
        </p>
      </div>
      {error ? (
        <p className={`${alertError} border-x-0 border-t-0 rounded-none`}>{error}</p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-5 py-4">Student name</th>
              <th className="px-5 py-4">Score</th>
              <th className="px-5 py-4">Feedback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {rows.map((row) => (
              <tr key={row.studentId}>
                <td className="px-5 py-4 font-medium">
                  {row.studentName}
                  {row.releasedAt ? (
                    <span className="ml-2 text-xs text-ink-muted">Released</span>
                  ) : null}
                </td>
                <td className="px-5 py-4">
                  <input
                    value={row.score}
                    onChange={(event) =>
                      update(row.studentId, "score", event.target.value)
                    }
                    className={`${fieldControlBase} w-24`}
                  />
                  <span className="ml-2 text-ink-secondary">/ {maxScore ?? "—"}</span>
                </td>
                <td className="px-5 py-4">
                  <input
                    value={row.feedback}
                    onChange={(event) =>
                      update(row.studentId, "feedback", event.target.value)
                    }
                    className={fieldControl}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-3 border-t border-line p-5">
        <button
          type="button"
          disabled={pending}
          className={buttonSecondary}
          onClick={() => void save(false)}
        >
          Save Grades
        </button>
        <button
          type="button"
          disabled={pending}
          className={buttonPrimary}
          onClick={() => void save(true)}
        >
          Release All
        </button>
      </div>
    </section>
  );
}
