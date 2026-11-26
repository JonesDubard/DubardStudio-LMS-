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
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [locallySubmittedIds, setLocallySubmittedIds] = useState<Set<string>>(
    new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const allSelected =
    rows.length > 0 && rows.every((row) => selectedStudentIds.has(row.studentId));

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

  function markSelectedAsSubmitted() {
    const selectedIds = [...selectedStudentIds];
    if (selectedIds.length === 0) return;

    // TODO: Wire to bulk update Server Action.
    setLocallySubmittedIds((current) => new Set([...current, ...selectedIds]));
    setSelectedStudentIds(new Set());
  }

  return (
    <section className={`${surfaceCard} rounded-2xl`}>
      <div className="border-b border-line px-4 py-4 sm:px-6 sm:py-5">
        <h2 className="font-semibold tracking-tight text-ink">Grade entry</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          One row per enrolled student. There is no digital submission.
        </p>
      </div>
      {error ? (
        <p className={`${alertError} border-x-0 border-t-0 rounded-none`}>{error}</p>
      ) : null}
      {selectedStudentIds.size > 0 ? (
        <div
          role="status"
          className="sticky bottom-20 z-10 mx-3 my-3 flex flex-col gap-3 rounded-xl border border-brand-border bg-surface/95 p-3 shadow-lift backdrop-blur sm:bottom-4 sm:mx-4 sm:flex-row sm:items-center sm:justify-between sm:px-4"
        >
          <p className="text-sm font-semibold text-ink">
            {selectedStudentIds.size}{" "}
            {selectedStudentIds.size === 1 ? "student" : "students"} selected
          </p>
          <button
            type="button"
            disabled={pending}
            className={`${buttonPrimary} w-full sm:w-auto`}
            onClick={markSelectedAsSubmitted}
          >
            Mark Selected as Submitted
          </button>
        </div>
      ) : null}
      <div className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={rows.length === 0}
            onChange={(event) =>
              setSelectedStudentIds(
                event.target.checked
                  ? new Set(rows.map((row) => row.studentId))
                  : new Set(),
              )
            }
            className="h-5 w-5 rounded border-line accent-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2"
            aria-label="Select all students"
          />
          Select all students
        </label>
        <span className="text-xs font-medium text-ink-muted">
          {rows.length} students
        </span>
      </div>
      <div className="space-y-3 p-3 md:hidden">
        {rows.map((row) => (
          <article
            key={row.studentId}
            className={`rounded-xl border p-4 transition-colors ${
              selectedStudentIds.has(row.studentId)
                ? "border-brand-border bg-brand-subtle/50"
                : "border-line bg-surface"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedStudentIds.has(row.studentId)}
                onChange={(event) =>
                  setSelectedStudentIds((current) => {
                    const next = new Set(current);
                    if (event.target.checked) {
                      next.add(row.studentId);
                    } else {
                      next.delete(row.studentId);
                    }
                    return next;
                  })
                }
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-line accent-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2"
                aria-label={`Select ${row.studentName}`}
              />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-ink">
                  {row.studentName}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
                  {row.releasedAt ? <span>Released</span> : null}
                  {locallySubmittedIds.has(row.studentId) ? (
                    <span className="font-medium text-success">
                      Submitted (local only)
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Score
                <span className="mt-1.5 flex items-center gap-2">
                  <input
                    value={row.score}
                    onChange={(event) =>
                      update(row.studentId, "score", event.target.value)
                    }
                    className={`${fieldControlBase} min-w-0 flex-1`}
                    aria-label={`Score for ${row.studentName}`}
                  />
                  <span className="shrink-0 text-sm font-normal normal-case text-ink-secondary">
                    / {maxScore ?? "—"}
                  </span>
                </span>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Feedback
                <input
                  value={row.feedback}
                  onChange={(event) =>
                    update(row.studentId, "feedback", event.target.value)
                  }
                  className={`${fieldControl} mt-1.5`}
                  aria-label={`Feedback for ${row.studentName}`}
                />
              </label>
            </div>
          </article>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="hidden w-full min-w-[40rem] text-sm md:table">
          <thead className="border-b border-line bg-surface-muted/50 text-left">
            <tr>
              <th className="w-12 px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={rows.length === 0}
                  onChange={(event) =>
                    setSelectedStudentIds(
                      event.target.checked
                        ? new Set(rows.map((row) => row.studentId))
                        : new Set(),
                    )
                  }
                  className="h-4 w-4 cursor-pointer rounded border-line accent-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2"
                  aria-label="Select all students"
                />
              </th>
              <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Student
              </th>
              <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Score
              </th>
              <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Feedback
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr
                key={row.studentId}
                className={`transition-colors hover:bg-surface-muted/50 ${
                  selectedStudentIds.has(row.studentId) ? "bg-brand-subtle/40" : ""
                }`}
              >
                <td className="px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.has(row.studentId)}
                    onChange={(event) =>
                      setSelectedStudentIds((current) => {
                        const next = new Set(current);
                        if (event.target.checked) {
                          next.add(row.studentId);
                        } else {
                          next.delete(row.studentId);
                        }
                        return next;
                      })
                    }
                    className="h-4 w-4 cursor-pointer rounded border-line accent-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2"
                    aria-label={`Select ${row.studentName}`}
                  />
                </td>
                <td className="px-4 py-3.5 font-medium text-ink">
                  {row.studentName}
                  {row.releasedAt ? (
                    <span className="ml-2 text-xs text-ink-muted">Released</span>
                  ) : null}
                  {locallySubmittedIds.has(row.studentId) ? (
                    <span className="ml-2 text-xs font-medium text-success">
                      Submitted (local only)
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3.5">
                  <input
                    value={row.score}
                    onChange={(event) =>
                      update(row.studentId, "score", event.target.value)
                    }
                    className={`${fieldControlBase} w-24`}
                    aria-label={`Score for ${row.studentName}`}
                  />
                  <span className="ml-2 text-ink-secondary">/ {maxScore ?? "—"}</span>
                </td>
                <td className="px-4 py-3.5">
                  <input
                    value={row.feedback}
                    onChange={(event) =>
                      update(row.studentId, "feedback", event.target.value)
                    }
                    className={fieldControl}
                    aria-label={`Feedback for ${row.studentName}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-line p-4 sm:flex-row sm:justify-end sm:px-6">
        <button
          type="button"
          disabled={pending}
          className={`${buttonSecondary} w-full sm:w-auto`}
          onClick={() => void save(false)}
        >
          Save Grades
        </button>
        <button
          type="button"
          disabled={pending}
          className={`${buttonPrimary} w-full sm:w-auto`}
          onClick={() => void save(true)}
        >
          Release All
        </button>
      </div>
    </section>
  );
}
