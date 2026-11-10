"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAssessment } from "@/lib/queries/assessments";
import type { AssessmentType } from "@/lib/types/assessments";
import { alertError, buttonPrimary, buttonSecondary, fieldControl, fieldLabel, surfaceCard } from "@/lib/ui/styles";

const fieldClass = fieldControl;

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
      className={`space-y-6 p-6 ${surfaceCard}`}
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
    >
      {error ? (
        <p className={alertError}>{error}</p>
      ) : null}

      <section className="space-y-5">
        <h2 className="text-base font-semibold tracking-tight text-ink">Details</h2>
        <div>
          <label className={fieldLabel} htmlFor="assessment-title">
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
          <label className={fieldLabel} htmlFor="assessment-type">
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
      </section>

      <section className="space-y-5">
        <h2 className="text-base font-semibold tracking-tight text-ink">Scoring</h2>
        <div>
          <label className={fieldLabel} htmlFor="assessment-due">
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
          <label className={fieldLabel} htmlFor="assessment-max">
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
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className={buttonSecondary}
        >
          Save as Draft
        </button>
        <button
          type="button"
          disabled={pending}
          className={buttonPrimary}
          onClick={() => void save(true)}
        >
          Publish
        </button>
      </div>
    </form>
  );
}
