"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveGrades } from "@/lib/queries/assessments";
import type { GradeRosterRow } from "@/lib/types/assessments";

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
    <section className="border border-[#999999] bg-white">
      <div className="border-b border-[#999999] p-5">
        <h2 className="font-semibold">Grade entry</h2>
        <p className="mt-1 text-sm text-[#666666]">
          One row per enrolled student. There is no digital submission.
        </p>
      </div>
      {error ? (
        <p className="border-b border-[#999999] px-5 py-3 text-sm">{error}</p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#E5E5E5] text-left">
            <tr>
              <th className="px-5 py-4">Student name</th>
              <th className="px-5 py-4">Score</th>
              <th className="px-5 py-4">Feedback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {rows.map((row) => (
              <tr key={row.studentId}>
                <td className="px-5 py-4 font-medium">
                  {row.studentName}
                  {row.releasedAt ? (
                    <span className="ml-2 text-xs text-[#666666]">Released</span>
                  ) : null}
                </td>
                <td className="px-5 py-4">
                  <input
                    value={row.score}
                    onChange={(event) =>
                      update(row.studentId, "score", event.target.value)
                    }
                    className="w-24 border border-[#999999] px-3 py-2"
                  />
                  <span className="ml-2 text-[#666666]">/ {maxScore ?? "—"}</span>
                </td>
                <td className="px-5 py-4">
                  <input
                    value={row.feedback}
                    onChange={(event) =>
                      update(row.studentId, "feedback", event.target.value)
                    }
                    className="w-full border border-[#999999] px-3 py-2"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-3 border-t border-[#999999] p-5">
        <button
          type="button"
          disabled={pending}
          className="border border-[#999999] bg-white px-5 py-3"
          onClick={() => void save(false)}
        >
          Save Grades
        </button>
        <button
          type="button"
          disabled={pending}
          className="border border-brand-primary bg-brand-primary px-5 py-3 text-white"
          onClick={() => void save(true)}
        >
          Release All
        </button>
      </div>
    </section>
  );
}
