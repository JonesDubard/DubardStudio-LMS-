import { buttonPrimary, buttonSecondary, fieldControl, fieldLabel, surfaceCard } from "@/lib/ui/styles";
import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
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
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium text-ink-muted">Lessons</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold tracking-tight md:text-2xl">
              My Lessons
            </h1>
            <p className="text-sm text-ink-secondary">
              Lessons on the courses assigned to you.
            </p>
          </div>
          <Link href="/teacher/lessons/new" className={buttonPrimary}>
            Create Lesson
          </Link>
        </div>
      </header>

      <div className="space-y-6 p-4 lg:p-8">
        {courses.length === 0 ? (
          <EmptyState icon={Inbox} title={NO_CLASSES_ASSIGNED_MESSAGE} />
        ) : (
          <>
            <form
              action="/teacher/lessons"
              method="get"
              className={`${surfaceCard} p-5`}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <label
                    htmlFor="filter-class"
                    className={fieldLabel}
                  >
                    Class
                  </label>
                  <select
                    id="filter-class"
                    name="class"
                    defaultValue={classId}
                    className={fieldControl}
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
                    className={fieldLabel}
                  >
                    Subject
                  </label>
                  <select
                    id="filter-subject"
                    name="subject"
                    defaultValue={subjectId}
                    className={fieldControl}
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
                    className={fieldLabel}
                  >
                    Term
                  </label>
                  <select
                    id="filter-term"
                    name="term"
                    defaultValue={termId}
                    className={fieldControl}
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
                    className={fieldLabel}
                  >
                    Status
                  </label>
                  <select
                    id="filter-status"
                    name="status"
                    defaultValue={status ?? ""}
                    className={fieldControl}
                  >
                    <option value="">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  className={buttonPrimary}
                >
                  Apply
                </button>
                {filtersActive ? (
                  <Link
                    href="/teacher/lessons"
                    className={buttonSecondary}
                  >
                    Clear
                  </Link>
                ) : null}
              </div>
            </form>

            {lessons.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={
                  filtersActive
                    ? "No lessons match these filters."
                    : "No lessons yet."
                }
              />
            ) : (
              <DataTable
                columns={[
                  { key: "title", header: "Title" },
                  { key: "class", header: "Class" },
                  { key: "subject", header: "Subject" },
                  { key: "course", header: "Course" },
                  { key: "updated", header: "Updated" },
                  { key: "status", header: "Status" },
                ]}
                rows={lessons.map((lesson) => ({
                  id: lesson.id,
                  cells: [
                    <Link
                      key="title"
                      href={`/teacher/lessons/${lesson.id}`}
                      className="font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {lesson.title}
                    </Link>,
                    lesson.class_name,
                    lesson.subject_name,
                    courseName(lesson.course_name),
                    formatUpdated(lesson.updated_at),
                    <StatusBadge key="status" label={statusLabel(lesson.status)} />,
                  ],
                }))}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
