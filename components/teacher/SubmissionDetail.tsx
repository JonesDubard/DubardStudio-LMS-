"use client";

import { useState } from "react";
import type { SubmissionDetail as SubmissionDetailData } from "@/lib/stubs/get-submissions-for-assessment";
import { buttonPrimary, buttonSecondary, fieldControl, fieldControlBase, fieldLabel, surfaceCard } from "@/lib/ui/styles";

type SubmissionDetailProps = {
  submission: SubmissionDetailData;
};

export function SubmissionDetail({ submission }: SubmissionDetailProps) {
  const [score, setScore] = useState(submission.score);
  const [feedback, setFeedback] = useState(submission.feedback);

  return (
    <section className={surfaceCard}>
      <div className="border-b border-line p-6">
        <p className="text-sm text-ink-secondary">Selected Student</p>
        <h2 className="mt-1 text-xl font-semibold">{submission.studentName}</h2>
        <p className="text-sm text-ink-secondary">
          {submission.className} · {submission.submittedAt}
        </p>
      </div>

      <div className="space-y-6 p-6">
        <div>
          <h3 className="font-semibold">Submitted Work</h3>

          <div className="mt-3 border border-line p-5">
            <p className="text-sm leading-6">{submission.writtenAnswer}</p>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4">
            <div>
              <p className="font-medium">{submission.fileName}</p>
              <p className="text-sm text-ink-secondary">{submission.fileMeta}</p>
            </div>
            <button type="button" className={buttonSecondary}>
              View File
            </button>
          </div>
        </div>

        <div>
          <label className={fieldLabel} htmlFor="grade-score">
            Grade
          </label>
          <div className="flex items-center gap-3">
            <input
              id="grade-score"
              type="text"
              value={score}
              onChange={(event) => setScore(event.target.value)}
              className={`${fieldControlBase} w-24`}
            />
            <span className="text-ink-secondary">/ {submission.maxScore}</span>
          </div>
        </div>

        <div>
          <label
            className={fieldLabel}
            htmlFor="teacher-feedback"
          >
            Teacher Feedback
          </label>
          <textarea
            id="teacher-feedback"
            rows={6}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            className={fieldControl}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <button
            type="button"
            disabled
            className={buttonSecondary}
          >
            Save Draft
          </button>

          <button
            type="button"
            className={buttonPrimary}
          >
            Release Grade
          </button>
        </div>
      </div>
    </section>
  );
}
