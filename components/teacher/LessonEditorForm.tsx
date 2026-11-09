"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { createLesson, updateLesson } from "@/app/teacher/lessons/actions";
import {
  createLessonSchema,
  emptyLessonContent,
  lessonContentSchema,
  type CreateLessonInput,
  type LessonContentInput,
} from "@/lib/lessons/schema";
import type { Lesson, TeacherCourse } from "@/lib/types/lessons";
import {
  buttonPrimary,
  buttonSecondary,
  fieldControl,
  fieldError,
  fieldLabel,
  surfaceCard,
} from "@/lib/ui/styles";

type LessonEditorFormProps =
  | { mode: "create"; courses: TeacherCourse[] }
  | { mode: "edit"; lesson: Lesson; course: TeacherCourse };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={fieldError}>
      {message}
    </p>
  );
}

function uniqueBy<T>(rows: T[], id: (row: T) => string): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const row of rows) {
    const key = id(row);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

const NO_COURSES: TeacherCourse[] = [];

function courseLabel(course: TeacherCourse): string {
  const name = course.name?.trim();
  if (name) return name;
  return `${course.subject_name} — ${course.term_name}`;
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={fieldLabel}>{label}</p>
      <p className="rounded-md border border-line bg-surface-muted px-3 py-2.5 text-sm text-ink">{value}</p>
    </div>
  );
}

export function LessonEditorForm(props: LessonEditorFormProps) {
  const router = useRouter();
  const publishRef = useRef(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const initialCourse =
    props.mode === "create" ? props.courses[0] : props.course;
  const [classId, setClassId] = useState(initialCourse?.class_id ?? "");
  const [subjectId, setSubjectId] = useState(initialCourse?.subject_id ?? "");

  const form = useForm<CreateLessonInput | LessonContentInput>({
    resolver: zodResolver(
      props.mode === "create" ? createLessonSchema : lessonContentSchema,
    ),
    defaultValues:
      props.mode === "create"
        ? {
            ...emptyLessonContent,
            course_id: initialCourse?.id ?? "",
          }
        : {
            title: props.lesson.title,
            description: props.lesson.description ?? "",
          },
  });

  const courses = props.mode === "create" ? props.courses : NO_COURSES;
  const classOptions = useMemo(
    () =>
      uniqueBy(courses, (course) => course.class_id).sort((left, right) =>
        left.class_name.localeCompare(right.class_name),
      ),
    [courses],
  );
  const subjectOptions = useMemo(
    () =>
      uniqueBy(
        courses.filter((course) => course.class_id === classId),
        (course) => course.subject_id,
      ).sort((left, right) =>
        left.subject_name.localeCompare(right.subject_name),
      ),
    [courses, classId],
  );
  const courseOptions = useMemo(
    () =>
      courses
        .filter(
          (course) =>
            course.class_id === classId && course.subject_id === subjectId,
        )
        .sort((left, right) =>
          courseLabel(left).localeCompare(courseLabel(right)),
        ),
    [courses, classId, subjectId],
  );

  function chooseClass(nextClassId: string) {
    setClassId(nextClassId);
    const nextSubjects = uniqueBy(
      courses.filter((course) => course.class_id === nextClassId),
      (course) => course.subject_id,
    );
    const nextSubjectId = nextSubjects[0]?.subject_id ?? "";
    setSubjectId(nextSubjectId);
    const nextCourse = courses.find(
      (course) =>
        course.class_id === nextClassId && course.subject_id === nextSubjectId,
    );
    form.setValue("course_id", nextCourse?.id ?? "", { shouldValidate: true });
  }

  function chooseSubject(nextSubjectId: string) {
    setSubjectId(nextSubjectId);
    const nextCourse = courses.find(
      (course) =>
        course.class_id === classId && course.subject_id === nextSubjectId,
    );
    form.setValue("course_id", nextCourse?.id ?? "", { shouldValidate: true });
  }

  async function onSubmit(values: CreateLessonInput | LessonContentInput) {
    setServerError(null);
    setSaved(false);
    const publish = publishRef.current;
    const result =
      props.mode === "create"
        ? await createLesson(values as CreateLessonInput, publish)
        : await updateLesson(props.lesson.id, values, publish);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    if (props.mode === "create") {
      router.push("/teacher/lessons");
      router.refresh();
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const saveLabel =
    props.mode === "edit" && props.lesson.status !== "draft"
      ? "Save"
      : "Save Draft";
  const titleError = form.formState.errors.title?.message;
  const descriptionError = form.formState.errors.description?.message;
  const courseError =
    "course_id" in form.formState.errors
      ? form.formState.errors.course_id?.message
      : undefined;

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      {serverError ? (
        <p
          role="alert"
          className={buttonSecondary}
        >
          {serverError}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm">
          Saved.
        </p>
      ) : null}

      <section className={`${surfaceCard} p-6`}>
        <h2 className="text-lg font-semibold">Lesson Details</h2>

        {props.mode === "create" ? (
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label
                className={fieldLabel}
                htmlFor="lesson-class"
              >
                Class
              </label>
              <select
                id="lesson-class"
                value={classId}
                onChange={(event) => chooseClass(event.target.value)}
                className={fieldControl}
              >
                {classOptions.map((course) => (
                  <option key={course.class_id} value={course.class_id}>
                    {course.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={fieldLabel}
                htmlFor="lesson-subject"
              >
                Subject
              </label>
              <select
                id="lesson-subject"
                value={subjectId}
                onChange={(event) => chooseSubject(event.target.value)}
                className={fieldControl}
              >
                {subjectOptions.map((course) => (
                  <option key={course.subject_id} value={course.subject_id}>
                    {course.subject_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={fieldLabel}
                htmlFor="lesson-course"
              >
                Course
              </label>
              <select
                id="lesson-course"
                value={form.watch("course_id") ?? ""}
                onChange={(event) =>
                  form.setValue("course_id", event.target.value, {
                    shouldValidate: true,
                  })
                }
                className={fieldControl}
              >
                {courseOptions.map((course) => (
                  <option key={course.id} value={course.id}>
                    {courseLabel(course)}
                  </option>
                ))}
              </select>
              <FieldError message={courseError} />
            </div>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            <ReadOnlyValue label="Class" value={props.course.class_name} />
            <ReadOnlyValue label="Subject" value={props.course.subject_name} />
            <ReadOnlyValue label="Course" value={courseLabel(props.course)} />
          </div>
        )}

        <div className="mt-5">
          <label
            className={fieldLabel}
            htmlFor="lesson-title"
          >
            Title
          </label>
          <input
            id="lesson-title"
            type="text"
            className={fieldControl}
            aria-invalid={titleError ? true : undefined}
            {...form.register("title")}
          />
          <FieldError message={titleError} />
        </div>

        <div className="mt-5">
          <label
            className={fieldLabel}
            htmlFor="lesson-description"
          >
            Description
          </label>
          <textarea
            id="lesson-description"
            rows={5}
            className={fieldControl}
            aria-invalid={descriptionError ? true : undefined}
            {...form.register("description")}
          />
          <FieldError message={descriptionError} />
        </div>
      </section>

      {/* TODO: wire uploads to public.files and lesson_materials.file_id.
          The table lands in 0005a_files.sql. Do not upload in this session. */}
      <section className={`${surfaceCard} p-6`}>
        <h2 className="text-lg font-semibold">Materials</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Attach PDF, document, or image materials.
        </p>
        <div className="mt-5 rounded-lg border border-dashed border-line-strong bg-surface-muted p-5">
          <p className="font-medium">Attachment uploads coming soon</p>
        </div>
      </section>

      <div className="flex items-center justify-between border-t border-line pt-6">
        <button
          type="button"
          disabled
          className={`${buttonSecondary} cursor-not-allowed`}
        >
          Preview
        </button>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            onClick={() => {
              publishRef.current = false;
            }}
            className={buttonSecondary}
          >
            {saveLabel}
          </button>

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            onClick={() => {
              publishRef.current = true;
            }}
            className={buttonPrimary}
          >
            Publish Lesson
          </button>
        </div>
      </div>
    </form>
  );
}
