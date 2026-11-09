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
      <div className="flex items-center justify-between border-b border-line p-5">
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
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface text-left text-xs font-medium text-ink-secondary">
            <tr>
              <th className="w-16 px-5 py-4">#</th>
              <th className="px-5 py-4">Student Name</th>
              <th className="w-48 px-5 py-4">Score</th>
              <th className="px-5 py-4">Comment</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors duration-150 hover:bg-surface-muted">
                <td className="px-5 py-4 text-ink-secondary">{row.indexLabel}</td>
                <td className="px-5 py-4 font-medium">{row.studentName}</td>
                <td className="px-5 py-4">
                  <input
                    value={row.score}
                    onChange={(event) =>
                      updateRow(row.id, "score", event.target.value)
                    }
                    className={`${fieldControlBase} w-24`}
                  />
                  <span className="ml-2 text-ink-secondary">/ {maxScore}</span>
                </td>
                <td className="px-5 py-4">
                  <input
                    value={row.comment}
                    onChange={(event) =>
                      updateRow(row.id, "comment", event.target.value)
                    }
                    className={fieldControl}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-line p-5">
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
