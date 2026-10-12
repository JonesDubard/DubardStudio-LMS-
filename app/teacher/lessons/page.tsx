import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  getSignedInTeacherId,
  getTeacherCourses,
  getTeacherLessons,
  parseLessonStatus,
} from "@/lib/queries/lessons";
import { NO_CLASSES_ASSIGNED_MESSAGE } from "@/lib/teacher/assignment-stub";
import { createClient } from "@/lib/supabase/server";
import type { LessonStatus, TeacherCourse } from "@/lib/types/lessons";

export const metadata: Metadata = {
  title: "My Lessons",
};

type LessonsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function statusLabel(status: LessonStatus): string {
  if (status === "published") return "PUBLISHED";
  if (status === "archived") return "ARCHIVED";
  return "DRAFT";
}

function formatUpdated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function optionsFor(
  courses: TeacherCourse[],
  kind: "class" | "subject" | "term",
): { id: string; label: string }[] {
  const labels = new Map<string, string>();
  for (const course of courses) {
    if (kind === "class") labels.set(course.class_id, course.class_name);
    if (kind === "subject") labels.set(course.subject_id, course.subject_name);
    if (kind === "term") labels.set(course.term_id, course.term_name);
  }
  return [...labels.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function courseName(name: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : "—";
}

export default async function TeacherLessonsPage({
  searchParams,
}: LessonsPageProps) {
  const params = await searchParams;
  const classId = first(params.class) ?? "";
  const subjectId = first(params.subject) ?? "";
  const termId = first(params.term) ?? "";
  const status = parseLessonStatus(first(params.status));

  const supabase = await createClient();
  const teacherId = await getSignedInTeacherId(supabase);
  const courses = await getTeacherCourses(supabase, teacherId);
  const lessons = await getTeacherLessons(supabase, {
    teacherId,
    classId: classId || undefined,
    subjectId: subjectId || undefined,
    termId: termId || undefined,
    status,
  });

  const classOptions = optionsFor(courses, "class");
  const subjectOptions = optionsFor(courses, "subject");
  const termOptions = optionsFor(courses, "term");
  const filtersActive = Boolean(classId || subjectId || termId || status);

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">Lessons</p>
        <div className="mt-1 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">My Lessons</h1>
            <p className="text-sm text-[#666666]">
              Lessons on the courses assigned to you.
            </p>
          </div>
          <Link
            href="/teacher/lessons/new"
            className="border border-[#333333] bg-[#333333] px-5 py-3 text-sm text-white"
          >
            Create Lesson
          </Link>
        </div>
      </header>

      <div className="space-y-6 p-8">
        {courses.length === 0 ? (
          <p className="border border-[#999999] bg-white px-4 py-6 text-sm">
            {NO_CLASSES_ASSIGNED_MESSAGE}
          </p>
        ) : (
          <>
            <form
              action="/teacher/lessons"
              method="get"
              className="border border-[#999999] bg-white p-5"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <label
                    htmlFor="filter-class"
                    className="mb-2 block text-sm font-medium"
                  >
                    Class
                  </label>
                  <select
                    id="filter-class"
                    name="class"
                    defaultValue={classId}
                    className="w-full border border-[#999999] bg-white px-3 py-3"
                  >
                    <option value="">All classes</option>
                    {classOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="filter-subject"
                    className="mb-2 block text-sm font-medium"
                  >
                    Subject
                  </label>
                  <select
                    id="filter-subject"
                    name="subject"
                    defaultValue={subjectId}
                    className="w-full border border-[#999999] bg-white px-3 py-3"
                  >
                    <option value="">All subjects</option>
                    {subjectOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="filter-term"
                    className="mb-2 block text-sm font-medium"
                  >
                    Term
                  </label>
                  <select
                    id="filter-term"
                    name="term"
                    defaultValue={termId}
                    className="w-full border border-[#999999] bg-white px-3 py-3"
                  >
                    <option value="">All terms</option>
                    {termOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="filter-status"
                    className="mb-2 block text-sm font-medium"
                  >
                    Status
                  </label>
                  <select
                    id="filter-status"
                    name="status"
                    defaultValue={status ?? ""}
                    className="w-full border border-[#999999] bg-white px-3 py-3"
                  >
                    <option value="">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="submit"
                  className="border border-[#333333] bg-[#333333] px-4 py-2 text-sm text-white"
                >
                  Apply
                </button>
                {filtersActive ? (
                  <Link
                    href="/teacher/lessons"
                    className="border border-[#999999] bg-white px-4 py-2 text-sm"
                  >
                    Clear
                  </Link>
                ) : null}
              </div>
            </form>

            <div className="overflow-x-auto border border-[#999999] bg-white">
              <table className="w-full text-sm">
                <thead className="bg-[#E5E5E5] text-left">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {lessons.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-6 text-sm text-[#666666]"
                        colSpan={6}
                      >
                        {filtersActive
                          ? "No lessons match these filters."
                          : "No lessons yet."}
                      </td>
                    </tr>
                  ) : (
                    lessons.map((lesson) => (
                      <tr key={lesson.id}>
                        <td className="px-4 py-4">
                          <Link
                            href={`/teacher/lessons/${lesson.id}`}
                            className="font-medium underline"
                          >
                            {lesson.title}
                          </Link>
                        </td>
                        <td className="px-4 py-4">{lesson.class_name}</td>
                        <td className="px-4 py-4">{lesson.subject_name}</td>
                        <td className="px-4 py-4">
                          {courseName(lesson.course_name)}
                        </td>
                        <td className="px-4 py-4">
                          {formatUpdated(lesson.updated_at)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge label={statusLabel(lesson.status)} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
