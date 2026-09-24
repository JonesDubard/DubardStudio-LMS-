"use client";

import { useState } from "react";
import type { GradeEntryRow } from "@/lib/stubs/get-grade-entry-roster";

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
    <section className="border border-[#999999] bg-white">
      <div className="flex items-center justify-between border-b border-[#999999] p-5">
        <div>
          <h2 className="font-semibold">Grade Entry</h2>
          <p className="mt-1 text-sm text-[#666666]">
            Enter the score recorded for each student.
          </p>
        </div>

        <span className="border border-[#999999] px-3 py-2 text-xs">
          {studentCountLabel}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#E5E5E5] text-left">
            <tr>
              <th className="w-16 px-5 py-4">#</th>
              <th className="px-5 py-4">Student Name</th>
              <th className="w-48 px-5 py-4">Score</th>
              <th className="px-5 py-4">Comment</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E5E5E5]">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-4 text-[#666666]">{row.indexLabel}</td>
                <td className="px-5 py-4 font-medium">{row.studentName}</td>
                <td className="px-5 py-4">
                  <input
                    value={row.score}
                    onChange={(event) =>
                      updateRow(row.id, "score", event.target.value)
                    }
                    className="w-24 border border-[#999999] px-3 py-2"
                  />
                  <span className="ml-2 text-[#666666]">/ {maxScore}</span>
                </td>
                <td className="px-5 py-4">
                  <input
                    value={row.comment}
                    onChange={(event) =>
                      updateRow(row.id, "comment", event.target.value)
                    }
                    className="w-full border border-[#999999] px-3 py-2"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-[#999999] p-5">
        <div>
          <p className="text-sm text-[#666666]">{lastSavedLabel}</p>
          <p className="text-sm">{lastSavedAt}</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            className="border border-[#999999] bg-white px-5 py-3"
          >
            Save Draft
          </button>

          <button
            type="button"
            className="border border-[#333333] bg-[#333333] px-5 py-3 text-white"
          >
            Release to Students
          </button>
        </div>
      </div>
    </section>
  );
}
