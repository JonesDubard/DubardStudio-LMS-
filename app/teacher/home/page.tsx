import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ClipboardList, Inbox } from "lucide-react";
import { ClassCard } from "@/components/teacher/ClassCard";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getTeacherAssessments } from "@/lib/queries/assessments";
import {
  getSignedInTeacherId,
  getTeacherCourses,
  getTeacherLessons,
} from "@/lib/queries/lessons";
import { NO_CLASSES_ASSIGNED_MESSAGE } from "@/lib/teacher/messages";
import { createClient } from "@/lib/supabase/server";
import type { AssessmentStatus } from "@/lib/types/assessments";
import type { LessonStatus, TeacherCourse } from "@/lib/types/lessons";
import { buttonSecondary } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Teacher Home",
};

const ASSESSMENT_CAP = 8;

function statusLabel(status: LessonStatus | AssessmentStatus): string {
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

function formatDue(value: string | null): string {
  if (!value) return "No due date";
  return formatUpdated(value);
}

function greetingFor(name: string, now: Date): string {
  const hour = now.getHours();
  const hello =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name.trim().split(/\s+/)[0];
  return first ? `${hello}, ${first}` : hello;
}

function formatToday(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
}

async function teacherFullName(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`auth: ${error.message}`);
  if (!data.user) return "";

  const result = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.user.id)
    .maybeSingle<{ full_name: string | null }>();
  if (result.error) throw new Error(`profiles: ${result.error.message}`);
  return result.data?.full_name?.trim() ?? "";
}

type HomeAssessment = {
  id: string;
  title: string;
  className: string;
  subjectName: string;
  status: AssessmentStatus;
  dueDate: string | null;
};

async function recentAssessments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courses: TeacherCourse[],
): Promise<HomeAssessment[]> {
  const grouped = await Promise.all(
    courses.map(async (course) => {
      const rows = await getTeacherAssessments(supabase, course.id);
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        className: course.class_name,
        subjectName: course.subject_name,
        status: row.status,
        dueDate: row.dueDate,
      }));
    }),
  );

  const assessments: HomeAssessment[] = [];
  const longest = grouped.reduce((max, list) => Math.max(max, list.length), 0);
  for (let index = 0; index < longest && assessments.length < ASSESSMENT_CAP; index += 1) {
    for (const list of grouped) {
      const row = list[index];
      if (!row) continue;
      assessments.push(row);
      if (assessments.length === ASSESSMENT_CAP) break;
    }
  }
  return assessments;
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        <p className="text-sm text-ink-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}

export default async function TeacherHomePage() {
  const now = new Date();
  const supabase = await createClient();
  const teacherId = await getSignedInTeacherId(supabase);
  const [teacherName, courses] = await Promise.all([
    teacherFullName(supabase),
    getTeacherCourses(supabase),
  ]);
  const [recentLessons, assessments] = await Promise.all([
    getTeacherLessons(supabase, { teacherId, limit: 5 }),
    recentAssessments(supabase, courses),
  ]);

  return (
    <main className="min-w-0 flex-1">
      <header className="bg-brand-primary px-4 py-6 text-white lg:px-8 lg:py-8">
        <p className="text-sm font-medium text-white/80">Teacher Home</p>
        <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight md:text-3xl">
          {greetingFor(teacherName, now)}
        </h1>
        <p className="mt-1 text-sm text-white/80">{formatToday(now)}</p>
      </header>

      <div className="space-y-8 p-4 lg:p-8">
        <section>
          <SectionHeading
            title="My Classes"
            description="Classes and subjects assigned to you."
            action={
              <Link href="/teacher/lessons" className={buttonSecondary}>
                View lessons
              </Link>
            }
          />

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
                  href={`/teacher/lessons?class=${course.class_id}`}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeading
            title="Recent Lessons"
            description="The latest lessons on your courses."
            action={
              <Link href="/teacher/lessons/new" className={buttonSecondary}>
                Create Lesson
              </Link>
            }
          />

          {courses.length === 0 ? (
            <EmptyState icon={Inbox} title={NO_CLASSES_ASSIGNED_MESSAGE} />
          ) : recentLessons.length === 0 ? (
            <EmptyState icon={Inbox} title="No lessons yet." />
          ) : (
            <DataTable
              columns={[
                { key: "lesson", header: "Lesson" },
                { key: "class", header: "Class" },
                { key: "subject", header: "Subject" },
                { key: "updated", header: "Updated" },
                { key: "status", header: "Status" },
              ]}
              rows={recentLessons.map((lesson) => ({
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
                  formatUpdated(lesson.updated_at),
                  <StatusBadge key="status" label={statusLabel(lesson.status)} />,
                ],
              }))}
            />
          )}
        </section>

        <section>
          <SectionHeading
            title="Assessments"
            description="Assessments on your courses. Open one to grade it."
          />

          {courses.length === 0 ? (
            <EmptyState icon={Inbox} title={NO_CLASSES_ASSIGNED_MESSAGE} />
          ) : assessments.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No assessments yet." />
          ) : (
            <DataTable
              columns={[
                { key: "title", header: "Assessment" },
                { key: "class", header: "Class" },
                { key: "subject", header: "Subject" },
                { key: "due", header: "Due" },
                { key: "status", header: "Status" },
              ]}
              rows={assessments.map((assessment) => ({
                id: assessment.id,
                cells: [
                  <Link
                    key="title"
                    href={`/teacher/assessments/${assessment.id}/submissions`}
                    className="font-medium text-ink underline-offset-2 hover:underline"
                  >
                    {assessment.title}
                  </Link>,
                  assessment.className,
                  assessment.subjectName,
                  formatDue(assessment.dueDate),
                  <StatusBadge key="status" label={statusLabel(assessment.status)} />,
                ],
              }))}
            />
          )}
        </section>
      </div>
    </main>
  );
}
