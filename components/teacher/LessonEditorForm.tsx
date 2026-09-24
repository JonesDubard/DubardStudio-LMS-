"use client";

import { useState } from "react";
import type { LessonForEdit } from "@/lib/stubs/get-lesson-for-edit";

type LessonEditorFormProps = {
  lesson: LessonForEdit;
};

export function LessonEditorForm({ lesson }: LessonEditorFormProps) {
  const [selectedClass, setSelectedClass] = useState(lesson.selectedClass);
  const [selectedSubject, setSelectedSubject] = useState(lesson.selectedSubject);
  const [selectedTerm, setSelectedTerm] = useState(lesson.selectedTerm);
  const [title, setTitle] = useState(lesson.lessonTitle);
  const [description, setDescription] = useState(lesson.description);
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl);

  return (
    <form className="space-y-6">
      <section className="border border-[#999999] bg-white p-6">
        <h2 className="text-lg font-semibold">Lesson Details</h2>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="lesson-class">
              Class
            </label>
            <select
              id="lesson-class"
              value={selectedClass}
              onChange={(event) => setSelectedClass(event.target.value)}
              className="w-full border border-[#999999] bg-white px-3 py-3"
            >
              {lesson.classOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="lesson-subject"
            >
              Subject / Course
            </label>
            <select
              id="lesson-subject"
              value={selectedSubject}
              onChange={(event) => setSelectedSubject(event.target.value)}
              className="w-full border border-[#999999] bg-white px-3 py-3"
            >
              {lesson.subjectOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="lesson-term">
              Term
            </label>
            <select
              id="lesson-term"
              value={selectedTerm}
              onChange={(event) => setSelectedTerm(event.target.value)}
              className="w-full border border-[#999999] bg-white px-3 py-3"
            >
              {lesson.termOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium" htmlFor="lesson-title">
            Title
          </label>
          <input
            id="lesson-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full border border-[#999999] px-3 py-3"
          />
        </div>

        <div className="mt-5">
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="lesson-description"
          >
            Description
          </label>
          <textarea
            id="lesson-description"
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full border border-[#999999] px-3 py-3"
          />
        </div>
      </section>

      <section className="border border-[#999999] bg-white p-6">
        <h2 className="text-lg font-semibold">Materials</h2>
        <p className="mt-1 text-sm text-[#666666]">
          Attach PDF, document, or image materials.
        </p>

        {lesson.materials.map((material, index) => (
          <div
            key={material.name}
            className={`${index === 0 ? "mt-5" : "mt-3"} border border-dashed border-[#999999] p-5`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{material.name}</p>
                <p className="text-sm text-[#666666]">{material.meta}</p>
              </div>
              <button type="button" className="border border-[#999999] px-4 py-2">
                {material.actionLabel}
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="border border-[#999999] bg-white p-6">
        <h2 className="text-lg font-semibold">External Video</h2>
        <p className="mt-1 text-sm text-[#666666]">
          Add a video link. Video files are not uploaded here.
        </p>

        <label
          className="mb-2 mt-5 block text-sm font-medium"
          htmlFor="lesson-video"
        >
          Video Link
        </label>
        <input
          id="lesson-video"
          type="url"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          className="w-full border border-[#999999] px-3 py-3"
        />
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
            Publish Lesson
          </button>
        </div>
      </div>
    </form>
  );
}
