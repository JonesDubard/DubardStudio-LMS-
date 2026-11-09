"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { gradeSubmission } from "@/lib/queries/assessments";
import type { SubmissionGradeView } from "@/lib/types/assessments";
import { alertError, buttonPrimary, fieldControl, fieldControlBase, fieldLabel } from "@/lib/ui/styles";

export function GradeSubmissionForm({
  submission,
  maxScore,
}: {
  submission: SubmissionGradeView;
  maxScore: number | null;
}) {
  const router = useRouter();
  const [score, setScore] = useState(
    submission.score === null ? "" : String(submission.score),
  );
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(release: boolean) {
    setError(null);
    setPending(true);
    const result = await gradeSubmission(submission.id, score, feedback, release);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="border border-[#999999] bg-white">
      <div className="border-b border-[#999999] p-6">
        <p className="text-sm text-[#666666]">Selected student</p>
        <h2 className="mt-1 text-xl font-semibold">{submission.studentName}</h2>
        <p className="text-sm text-[#666666]">
          {new Date(submission.submittedAt).toLocaleString()}
          {submission.releasedAt ? " · Released" : ""}
        </p>
      </div>
      <div className="space-y-6 p-6">
        <div>
          <h3 className="font-semibold">Submitted work</h3>
          <div className="mt-3 border border-[#999999] p-5">
            <p className="whitespace-pre-wrap text-sm leading-6">
              {submission.text ?? "No written answer."}
            </p>
          </div>
        </div>
        {error ? (
          <p className={alertError}>{error}</p>
        ) : null}
        <div>
          <label className={fieldLabel} htmlFor="grade-score">
            Grade
          </label>
          <div className="flex items-center gap-3">
            <input
              id="grade-score"
              value={score}
              onChange={(event) => setScore(event.target.value)}
              className={`${fieldControlBase} w-24`}
            />
            <span className="text-ink-secondary">/ {maxScore ?? "—"}</span>
          </div>
        </div>
        <div>
          <label className={fieldLabel} htmlFor="teacher-feedback">
            Feedback
          </label>
          <textarea
            id="teacher-feedback"
            rows={6}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            className={fieldControl}
          />
        </div>
        <div className="flex justify-end border-t border-line pt-5">
          <button
            type="button"
            disabled={pending}
            className={buttonPrimary}
            onClick={() => void save(true)}
          >
            Release
          </button>
        </div>
      </div>
    </section>
  );
}
