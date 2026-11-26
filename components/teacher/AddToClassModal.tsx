"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { duplicateLesson } from "@/app/teacher/lessons/actions";
import type { TeacherCourse } from "@/lib/types/lessons";
import {
  alertError,
  buttonPrimary,
  buttonSecondary,
  fieldControl,
  fieldLabel,
} from "@/lib/ui/styles";

export function AddToClassModal({
  lessonId,
  lessonTitle,
  courses,
}: {
  lessonId: string;
  lessonTitle: string;
  courses: TeacherCourse[];
}) {
  const router = useRouter();
  const initialCourse = courses[0];
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState(initialCourse?.class_id ?? "");
  const [courseId, setCourseId] = useState(initialCourse?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const classes = [
    ...new Map(
      courses.map((course) => [course.class_id, course.class_name]),
    ).entries(),
  ].sort((left, right) => left[1].localeCompare(right[1]));
  const classCourses = courses.filter((course) => course.class_id === classId);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function chooseClass(nextClassId: string) {
    setClassId(nextClassId);
    setCourseId(
      courses.find((course) => course.class_id === nextClassId)?.id ?? "",
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseId) return;

    setError(null);
    setPending(true);
    const result = await duplicateLesson(lessonId, courseId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push(`/teacher/lessons/${result.lessonId}`);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        disabled={courses.length === 0}
        className={buttonPrimary}
        onClick={() => setOpen(true)}
      >
        Add to Class
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`add-to-class-title-${lessonId}`}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-line bg-surface p-6 text-ink shadow-lift"
          >
            <h2
              id={`add-to-class-title-${lessonId}`}
              className="text-lg font-semibold tracking-tight"
            >
              Add to Class
            </h2>
            <p className="mt-1 text-sm text-ink-secondary">{lessonTitle}</p>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor={`target-class-${lessonId}`} className={fieldLabel}>
                  Class
                </label>
                <select
                  id={`target-class-${lessonId}`}
                  value={classId}
                  onChange={(event) => chooseClass(event.target.value)}
                  className={fieldControl}
                  required
                >
                  {classes.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`target-course-${lessonId}`} className={fieldLabel}>
                  Course
                </label>
                <select
                  id={`target-course-${lessonId}`}
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  className={fieldControl}
                  required
                >
                  {classCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.subject_name} · {course.term_name}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs leading-5 text-ink-secondary">
                This creates a draft copy in the selected course. The original
                lesson stays unchanged.
              </p>
              {error ? (
                <p role="alert" className={alertError}>
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  disabled={pending}
                  className={buttonSecondary}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || !courseId}
                  className={buttonPrimary}
                >
                  {pending ? "Copying..." : "Create draft"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
