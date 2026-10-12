import type { Metadata } from "next";
import Link from "next/link";
import { LessonEditorForm } from "@/components/teacher/LessonEditorForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  getSignedInTeacherId,
  getTeacherCourses,
} from "@/lib/queries/lessons";
import { NO_CLASSES_ASSIGNED_MESSAGE } from "@/lib/teacher/assignment-stub";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create Lesson",
};

export default async function NewLessonPage() {
  const supabase = await createClient();
  const teacherId = await getSignedInTeacherId(supabase);
  const courses = await getTeacherCourses(supabase, teacherId);

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">Lessons / Create Lesson</p>
        <div className="mt-1 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">Create Lesson</h1>
            <p className="text-sm text-[#666666]">
              Build a lesson for your selected class and subject.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/teacher/lessons"
              className="border border-[#999999] bg-white px-4 py-2 text-sm"
            >
              All Lessons
            </Link>
            <Link
              href="/teacher/lessons/1/reuse"
              className="border border-[#999999] bg-white px-4 py-2 text-sm"
            >
              Reuse Lesson
            </Link>
            <StatusBadge
              label="DRAFT"
              className="border border-[#999999] px-3 py-2 text-sm"
            />
          </div>
        </div>
      </header>

      <div className="max-w-5xl p-8">
        {courses.length === 0 ? (
          <p className="border border-[#999999] bg-white px-4 py-6 text-sm">
            {NO_CLASSES_ASSIGNED_MESSAGE}
          </p>
        ) : (
          <LessonEditorForm mode="create" courses={courses} />
        )}
      </div>
    </main>
  );
}
