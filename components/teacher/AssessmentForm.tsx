"use client";

import { useState } from "react";
import type { AssignmentForEdit } from "@/lib/stubs/get-assignment-for-edit";
import { buttonPrimary, buttonSecondary, fieldControl, fieldLabel, surfaceCard } from "@/lib/ui/styles";

type AssessmentFormProps = {
  data: AssignmentForEdit;
};

export function AssessmentForm({ data }: AssessmentFormProps) {
  const [title, setTitle] = useState(data.assessment.title);
  const [instructions, setInstructions] = useState(data.assessment.instructions);
  const [dueLabel, setDueLabel] = useState(data.assessment.dueLabel);

  return (
    <form className="space-y-6">
      <section className={`${surfaceCard} p-6`}>
        <h2 className="text-lg font-semibold">Linked Lesson</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface-muted p-4">
            <p className="text-xs text-ink-muted">Class</p>
            <p className="mt-1 font-medium">{data.assessment.className}</p>
          </div>

          <div className="rounded-lg border border-line bg-surface-muted p-4">
            <p className="text-xs text-ink-muted">Subject</p>
            <p className="mt-1 font-medium">{data.assessment.subject}</p>
          </div>

          <div className="rounded-lg border border-line bg-surface-muted p-4">
            <p className="text-xs text-ink-muted">Lesson</p>
            <p className="mt-1 font-medium">{data.assessment.lessonTitle}</p>
          </div>
        </div>
      </section>

      <section className={`${surfaceCard} p-6`}>
        <h2 className="text-lg font-semibold">Assignment Details</h2>

        <div className="mt-5">
          <label className={fieldLabel} htmlFor="assignment-title">
            Title
          </label>
          <input
            id="assignment-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={fieldControl}
          />
        </div>

        <div className="mt-5">
          <label
            className={fieldLabel}
            htmlFor="assignment-instructions"
          >
            Instructions
          </label>
          <textarea
            id="assignment-instructions"
            rows={6}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            className={fieldControl}
          />
        </div>

        <div className="mt-5">
          <label
            className={fieldLabel}
            htmlFor="assignment-due"
          >
            Due Date
          </label>
          <input
            id="assignment-due"
            type="text"
            value={dueLabel}
            onChange={(event) => setDueLabel(event.target.value)}
            className={fieldControl}
          />
        </div>
      </section>

      <section className={`${surfaceCard} p-6`}>
        <h2 className="text-lg font-semibold">Materials</h2>

        <div className="mt-4 rounded-lg border border-dashed border-line-strong bg-surface-muted p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{data.material.name}</p>
              <p className="text-sm text-ink-secondary">{data.material.meta}</p>
            </div>
            <button type="button" className={buttonSecondary}>
              {data.material.actionLabel}
            </button>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between border-t border-line pt-6">
        <button
          type="button"
          disabled
          className={buttonSecondary}
        >
          Preview
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            className={buttonSecondary}
          >
            Save Draft
          </button>

          <button
            type="button"
            className={buttonPrimary}
          >
            Publish Assignment
          </button>
        </div>
      </div>
    </form>
  );
}
