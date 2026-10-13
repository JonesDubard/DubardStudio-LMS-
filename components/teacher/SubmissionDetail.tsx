"use client";

import { useState } from "react";
import type { SubmissionDetail as SubmissionDetailData } from "@/lib/stubs/get-submissions-for-assessment";

type SubmissionDetailProps = {
  submission: SubmissionDetailData;
};

export function SubmissionDetail({ submission }: SubmissionDetailProps) {
  const [score, setScore] = useState(submission.score);
  const [feedback, setFeedback] = useState(submission.feedback);

  return (
    <section className="border border-[#999999] bg-white">
      <div className="border-b border-[#999999] p-6">
        <p className="text-sm text-[#666666]">Selected Student</p>
        <h2 className="mt-1 text-xl font-semibold">{submission.studentName}</h2>
        <p className="text-sm text-[#666666]">
          {submission.className} · {submission.submittedAt}
        </p>
      </div>

      <div className="space-y-6 p-6">
        <div>
          <h3 className="font-semibold">Submitted Work</h3>

          <div className="mt-3 border border-[#999999] p-5">
            <p className="text-sm leading-6">{submission.writtenAnswer}</p>
          </div>

          <div className="mt-3 flex items-center justify-between border border-[#999999] p-4">
            <div>
              <p className="font-medium">{submission.fileName}</p>
              <p className="text-sm text-[#666666]">{submission.fileMeta}</p>
            </div>
            <button type="button" className="border border-[#999999] px-4 py-2">
              View File
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block font-semibold" htmlFor="grade-score">
            Grade
          </label>
          <div className="flex items-center gap-3">
            <input
              id="grade-score"
              type="text"
              value={score}
              onChange={(event) => setScore(event.target.value)}
              className="w-24 border border-[#999999] px-3 py-3"
            />
            <span className="text-[#666666]">/ {submission.maxScore}</span>
          </div>
        </div>

        <div>
          <label
            className="mb-2 block font-semibold"
            htmlFor="teacher-feedback"
          >
            Teacher Feedback
          </label>
          <textarea
            id="teacher-feedback"
            rows={6}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            className="w-full border border-[#999999] px-3 py-3"
          />
        </div>

        <div className="flex items-center justify-between border-t border-[#999999] pt-5">
          <button
            type="button"
            disabled
            className="cursor-not-allowed border border-[#999999] bg-[#E5E5E5] px-5 py-3 text-[#666666]"
          >
            Save Draft
          </button>

          <button
            type="button"
            className="border border-brand-primary bg-brand-primary px-5 py-3 text-white"
          >
            Release Grade
          </button>
        </div>
      </div>
    </section>
  );
}
