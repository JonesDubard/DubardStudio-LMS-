"use client";

import { useState } from "react";
import type { AssignmentForEdit } from "@/lib/stubs/get-assignment-for-edit";

type AssessmentFormProps = {
  data: AssignmentForEdit;
};

export function AssessmentForm({ data }: AssessmentFormProps) {
  const [title, setTitle] = useState(data.assessment.title);
  const [instructions, setInstructions] = useState(data.assessment.instructions);
  const [dueLabel, setDueLabel] = useState(data.assessment.dueLabel);

  return (
    <form className="space-y-6">
      <section className="border border-[#999999] bg-white p-6">
        <h2 className="text-lg font-semibold">Linked Lesson</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="border border-[#999999] p-4">
            <p className="text-xs text-[#666666]">Class</p>
            <p className="mt-1 font-medium">{data.assessment.className}</p>
          </div>

          <div className="border border-[#999999] p-4">
            <p className="text-xs text-[#666666]">Subject</p>
            <p className="mt-1 font-medium">{data.assessment.subject}</p>
          </div>

          <div className="border border-[#999999] p-4">
            <p className="text-xs text-[#666666]">Lesson</p>
            <p className="mt-1 font-medium">{data.assessment.lessonTitle}</p>
          </div>
        </div>
      </section>

      <section className="border border-[#999999] bg-white p-6">
        <h2 className="text-lg font-semibold">Assignment Details</h2>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium" htmlFor="assignment-title">
            Title
          </label>
          <input
            id="assignment-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full border border-[#999999] px-3 py-3"
          />
        </div>

        <div className="mt-5">
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="assignment-instructions"
          >
            Instructions
          </label>
          <textarea
            id="assignment-instructions"
            rows={6}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            className="w-full border border-[#999999] px-3 py-3"
          />
        </div>

        <div className="mt-5">
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="assignment-due"
          >
            Due Date
          </label>
          <input
            id="assignment-due"
            type="text"
            value={dueLabel}
            onChange={(event) => setDueLabel(event.target.value)}
            className="w-full border border-[#999999] px-3 py-3"
          />
        </div>
      </section>

      <section className="border border-[#999999] bg-white p-6">
        <h2 className="text-lg font-semibold">Materials</h2>

        <div className="mt-4 border border-dashed border-[#999999] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{data.material.name}</p>
              <p className="text-sm text-[#666666]">{data.material.meta}</p>
            </div>
            <button type="button" className="border border-[#999999] px-4 py-2">
              {data.material.actionLabel}
            </button>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between border-t border-[#999999] pt-6">
        <button
          type="button"
          disabled
          className="cursor-not-allowed border border-[#999999] bg-[#E5E5E5] px-5 py-3 text-[#666666]"
        >
          Preview
        </button>

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
            Publish Assignment
          </button>
        </div>
      </div>
    </form>
  );
}
