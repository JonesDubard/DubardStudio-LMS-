"use client";

import { useState } from "react";
import type { GradeEntryRow } from "@/lib/stubs/get-grade-entry-roster";
import { buttonPrimary, buttonSecondary, fieldControl, fieldControlBase, surfaceCard } from "@/lib/ui/styles";

type GradeEntryTableProps = {
  maxScore: number;
  studentCountLabel: string;
  lastSavedLabel: string;
  lastSavedAt: string;
  rows: GradeEntryRow[];
};

export function GradeEntryTable({
  maxScore,
  studentCountLabel,
  lastSavedLabel,
  lastSavedAt,
  rows: initialRows,
}: GradeEntryTableProps) {
  const [rows, setRows] = useState(initialRows);

  function updateRow(
    id: string,
    field: "score" | "comment",
    value: string,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, [field]: value } : row,
      ),
    );
  }

  return (
    <section className={surfaceCard}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <div>
          <h2 className="font-semibold">Grade Entry</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Enter the score recorded for each student.
          </p>
        </div>

        <span className="rounded-md border border-line bg-surface-muted px-3 py-1.5 text-xs font-medium text-ink-secondary">
          {studentCountLabel}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-line bg-surface text-left">
            <tr>
              <th className="w-16 px-4 py-3 text-xs font-medium text-ink-secondary">#</th>
              <th className="px-4 py-3 text-xs font-medium text-ink-secondary">Student Name</th>
              <th className="w-48 px-4 py-3 text-xs font-medium text-ink-secondary">Score</th>
              <th className="px-4 py-3 text-xs font-medium text-ink-secondary">Comment</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors duration-150 hover:bg-surface-muted">
                <td className="px-4 py-3 text-ink-secondary">{row.indexLabel}</td>
                <td className="px-4 py-3 font-medium">{row.studentName}</td>
                <td className="px-4 py-3">
                  <input
                    value={row.score}
                    onChange={(event) =>
                      updateRow(row.id, "score", event.target.value)
                    }
                    className={`${fieldControlBase} w-24`}
                    aria-label={`Score for ${row.studentName}`}
                  />
                  <span className="ml-2 text-ink-secondary">/ {maxScore}</span>
                </td>
                <td className="px-4 py-3">
                  <input
                    value={row.comment}
                    onChange={(event) =>
                      updateRow(row.id, "comment", event.target.value)
                    }
                    className={fieldControl}
                    aria-label={`Comment for ${row.studentName}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
        <div>
          <p className="text-sm text-ink-secondary">{lastSavedLabel}</p>
          <p className="text-sm">{lastSavedAt}</p>
        </div>

        <div className="flex gap-3">
          <button type="button" className={buttonSecondary}>
            Save Draft
          </button>

          <button type="button" className={buttonPrimary}>
            Release to Students
          </button>
        </div>
      </div>
    </section>
  );
}
