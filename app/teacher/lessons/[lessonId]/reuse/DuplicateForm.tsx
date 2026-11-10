"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { TeacherCourse } from "@/lib/types/lessons";
import { alertError, buttonPrimary, fieldControl, fieldLabel } from "@/lib/ui/styles";
import { duplicateLesson } from "../../actions";

function courseLabel(course: TeacherCourse): string {
  const name = course.name ? ` · ${course.name}` : "";
  return `${course.class_name} · ${course.subject_name} · ${course.term_name}${name}`;
}

export function DuplicateForm({
  lessonId,
  courses,
  defaultCourseId,
}: {
  lessonId: string;
  courses: TeacherCourse[];
  defaultCourseId: string;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(defaultCourseId);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const result = await duplicateLesson(lessonId, courseId);
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.push(`/teacher/lessons/${result.lessonId}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className={fieldLabel} htmlFor="duplicate-course">
          Course
        </label>
        <select
          id="duplicate-course"
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
          className={fieldControl}
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {courseLabel(course)}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending || courses.length === 0} className={buttonPrimary}>
        {pending ? "Copying..." : "Create draft"}
      </button>
    </form>
  );
}
