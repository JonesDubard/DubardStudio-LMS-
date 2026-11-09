"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAssessment } from "@/lib/queries/assessments";
import type { AssessmentType } from "@/lib/types/assessments";

const fieldClass = "w-full border border-[#999999] px-3 py-3";

export function CreateAssessmentForm({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AssessmentType>("assignment");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(publish: boolean) {
    setError(null);
    setPending(true);
    const result = await createAssessment({
      lessonId,
      title,
      type,
      dueDate,
      maxScore,
      publish,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/teacher/assessments/${result.id}/submissions`);
    router.refresh();
  }

  return (
    <form
      className="space-y-6 border border-[#999999] bg-white p-6"
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
    >
      {error ? (
        <p className="border border-[#333333] bg-[#E5E5E5] px-3 py-2 text-sm">{error}</p>
      ) : null}

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="assessment-title">
          Title
        </label>
        <input
          id="assessment-title"
          className={fieldClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="assessment-type">
          Type
        </label>
        <select
          id="assessment-type"
          className={fieldClass}
          value={type}
          onChange={(event) => setType(event.target.value as AssessmentType)}
        >
          <option value="assignment">Assignment</option>
          <option value="quiz">Quiz</option>
          <option value="test">Test</option>
          <option value="exam">Exam</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="assessment-due">
          Due date
        </label>
        <input
          id="assessment-due"
          className={fieldClass}
          type="datetime-local"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="assessment-max">
          Max score{type === "assignment" ? " (optional)" : ""}
        </label>
        <input
          id="assessment-max"
          className={fieldClass}
          inputMode="decimal"
          value={maxScore}
          onChange={(event) => setMaxScore(event.target.value)}
          required={type !== "assignment"}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="border border-[#999999] bg-white px-5 py-3"
        >
          Save as Draft
        </button>
        <button
          type="button"
          disabled={pending}
          className="border border-brand-primary bg-brand-primary px-5 py-3 text-white"
          onClick={() => void save(true)}
        >
          Publish
        </button>
      </div>
    </form>
  );
}
