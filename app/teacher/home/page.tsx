import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { ClassCard } from "@/components/teacher/ClassCard";
import { GradingQueueRow } from "@/components/teacher/GradingQueueRow";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  getSignedInTeacherId,
  getTeacherCourses,
  getTeacherLessons,
} from "@/lib/queries/lessons";
import { NO_CLASSES_ASSIGNED_MESSAGE } from "@/lib/teacher/assignment-stub";
import { getTeacherHome } from "@/lib/stubs/get-teacher-home";
import { createClient } from "@/lib/supabase/server";
import type { LessonStatus } from "@/lib/types/lessons";
import { buttonSecondary, surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Teacher Home",
};

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

export default async function TeacherHomePage() {
  const home = getTeacherHome();
  const supabase = await createClient();
  const teacherId = await getSignedInTeacherId(supabase);
  const courses = await getTeacherCourses(supabase, teacherId);
  const recentLessons = await getTeacherLessons(supabase, {
    teacherId,
    limit: 5,
  });

  return (
    <main className="min-w-0 flex-1">
      <header className="bg-brand-primary px-4 py-5 lg:px-8 lg:py-6 text-white">
        <p className="text-sm text-white/80">{home.eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{home.greeting}</h1>
        <p className="mt-1 text-sm text-white/80">{home.dateLabel}</p>
      </header>

      <div className="space-y-8 p-4 lg:p-8">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">My Classes</h2>
              <p className="text-sm text-ink-secondary">
                Classes and subjects assigned to you.
              </p>
            </div>
            <Link href="/teacher/lessons" className={buttonSecondary}>
              View Classes
            </Link>
          </div>

          {courses.length === 0 ? (
            <EmptyState icon={Inbox} title={NO_CLASSES_ASSIGNED_MESSAGE} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {courses.map((course) => (
                <ClassCard
                  key={course.id}
                  name={course.class_name}
                  subject={course.subject_name}
                  studentCountLabel={course.term_name}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">Recent Lessons</h2>
              <p className="text-sm text-ink-secondary">
                The latest lessons on your courses.
              </p>
            </div>
            <Link href="/teacher/lessons/new" className={buttonSecondary}>
              Create Lesson
            </Link>
          </div>

          {courses.length === 0 ? (
            <EmptyState icon={Inbox} title={NO_CLASSES_ASSIGNED_MESSAGE} />
          ) : recentLessons.length === 0 ? (
            <EmptyState icon={Inbox} title="No lessons yet." />
          ) : (
            <div className={`overflow-x-auto ${surfaceCard}`}>
              <table className="w-full text-sm">
                <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-3">Lesson</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {recentLessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td className="px-4 py-4">
                        <Link
                          href={`/teacher/lessons/${lesson.id}`}
                          className="font-medium text-ink underline-offset-2 hover:underline"
                        >
                          {lesson.title}
                        </Link>
                      </td>
                      <td className="px-4 py-4">{lesson.class_name}</td>
                      <td className="px-4 py-4">{lesson.subject_name}</td>
                      <td className="px-4 py-4">
                        {formatUpdated(lesson.updated_at)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge label={statusLabel(lesson.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">Pending Grading</h2>
              <p className="text-sm text-ink-secondary">
                Work and assessments requiring your attention.
              </p>
            </div>
            <button type="button" className={buttonSecondary}>
              Open Grading
            </button>
          </div>

          <div className={`overflow-x-auto ${surfaceCard}`}>
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Assessment</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Pending</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {home.pendingGrading.map((item) => (
                  <GradingQueueRow
                    key={item.id}
                    title={item.title}
                    className={item.className}
                    typeLabel={item.typeLabel}
                    pendingLabel={item.pendingLabel}
                    actionLabel={item.actionLabel}
                    href={item.href}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Upcoming Assignments</h2>
            <p className="text-sm text-ink-secondary">
              Assignments scheduled for your classes.
            </p>
          </div>

          <div className={`overflow-x-auto ${surfaceCard}`}>
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Assignment</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Lesson</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {home.upcomingAssignments.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4">{item.title}</td>
                    <td className="px-4 py-4">{item.className}</td>
                    <td className="px-4 py-4">{item.lessonTitle}</td>
                    <td className="px-4 py-4">{item.dueLabel}</td>
                    <td className="px-4 py-4">
                      <StatusBadge label={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
