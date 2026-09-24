import type { Metadata } from "next";
import Link from "next/link";
import { LessonEditorForm } from "@/components/teacher/LessonEditorForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getLessonForEdit } from "@/lib/stubs/get-lesson-for-edit";

export const metadata: Metadata = {
  title: "Create Lesson",
};

export default function NewLessonPage() {
  const lesson = getLessonForEdit("new");

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">{lesson.eyebrow}</p>
        <div className="mt-1 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">{lesson.title}</h1>
            <p className="text-sm text-[#666666]">{lesson.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/teacher/lessons/1/reuse"
              className="border border-[#999999] bg-white px-4 py-2 text-sm"
            >
              Reuse Lesson
            </Link>
            <StatusBadge
              label={lesson.status}
              className="border border-[#999999] px-3 py-2 text-sm"
            />
          </div>
        </div>
      </header>

      <div className="max-w-5xl p-8">
        <LessonEditorForm lesson={lesson} />
      </div>
    </main>
  );
}
