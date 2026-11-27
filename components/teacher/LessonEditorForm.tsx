"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  addLessonFile,
  addLessonLink,
  createLesson,
  updateLesson,
} from "@/app/teacher/lessons/actions";
import type { LessonMaterialItem } from "@/lib/queries/lessons";
import {
  createLessonSchema,
  emptyLessonContent,
  lessonContentSchema,
  type CreateLessonInput,
  type LessonContentInput,
} from "@/lib/lessons/schema";
import type { Lesson, TeacherCourse } from "@/lib/types/lessons";
import {
  alertError,
  buttonPrimary,
  buttonSecondary,
  fieldControl,
  fieldError,
  fieldLabel,
  surfaceCard,
} from "@/lib/ui/styles";

type LessonEditorFormProps =
  | { mode: "create"; courses: TeacherCourse[] }
  | { mode: "edit"; lesson: Lesson; course: TeacherCourse; materials: LessonMaterialItem[] };

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

function LessonMaterials({
  lessonId,
  materials,
  file,
  onFileChange,
  onUploadFile,
  uploadingFile,
}: {
  lessonId: string;
  materials: LessonMaterialItem[];
  file: File | null;
  onFileChange: (file: File | null) => void;
  onUploadFile: () => Promise<{ ok: true } | { ok: false; error: string }>;
  uploadingFile: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkPending, setLinkPending] = useState(false);

  useEffect(() => {
    if (!file && fileInputRef.current) fileInputRef.current.value = "";
  }, [file]);

  async function onFile() {
    if (!file) {
      setError("Choose a file to attach.");
      return;
    }
    setError(null);
    const result = await onUploadFile();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function onLink() {
    setError(null);
    setLinkPending(true);
    const result = await addLessonLink(lessonId, url);
    setLinkPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUrl("");
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-4">
      {materials.length === 0 ? (
        <p className="text-sm text-ink-secondary">No materials on this lesson yet.</p>
      ) : (
        <ul className="divide-y divide-line border border-line">
          {materials.map((material) => (
            <li key={material.id} className="px-4 py-3 text-sm font-medium">
              {material.name}
            </li>
          ))}
        </ul>
      )}
      {error ? <p className={alertError}>{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/webp"
          className="block min-w-0 flex-1 text-sm"
          onChange={(event) => onFileChange(event.currentTarget.files?.[0] ?? null)}
        />
        <button
          type="button"
          className={buttonSecondary}
          disabled={uploadingFile}
          onClick={() => void onFile()}
        >
          {uploadingFile ? "Uploading file..." : "Add file"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://"
          className={`${fieldControl} min-w-0 flex-1`}
          disabled={linkPending}
        />
        <button
          type="button"
          className={buttonSecondary}
          disabled={linkPending || !url.trim()}
          onClick={() => void onLink()}
        >
          {linkPending ? "Adding link..." : "Add link"}
        </button>
      </div>
    </div>
  );
}

export function LessonEditorForm(props: LessonEditorFormProps) {
  const router = useRouter();
  const publishRef = useRef(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

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
            is_reusable: props.lesson.is_reusable,
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

  async function uploadSelectedFile(): Promise<
    { ok: true } | { ok: false; error: string }
  > {
    if (props.mode !== "edit" || !selectedFile) return { ok: true };

    setUploadingFile(true);
    try {
      const result = await addLessonFile(props.lesson.id, selectedFile);
      if (result.ok) setSelectedFile(null);
      return result;
    } finally {
      setUploadingFile(false);
    }
  }

  async function onSubmit(values: CreateLessonInput | LessonContentInput) {
    setServerError(null);
    setSaved(false);
    const publish = publishRef.current;
    if (props.mode === "edit" && selectedFile) {
      const uploadResult = await uploadSelectedFile();
      if (!uploadResult.ok) {
        setServerError(uploadResult.error);
        return;
      }
    }

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
    if (publish) {
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
        <p role="alert" className={alertError}>
          {serverError}
        </p>
      ) : null}
      {saved ? (
        <p
          role="status"
          className="rounded-lg border border-success-border bg-success-subtle px-3 py-2 text-sm text-success"
        >
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

        <div className="mt-5">
          <label
            htmlFor="lesson-is-reusable"
            className="flex cursor-pointer items-center gap-3"
          >
            <input
              id="lesson-is-reusable"
              type="checkbox"
              className="peer sr-only"
              {...form.register("is_reusable")}
            />
            <span
              aria-hidden
              className="relative h-6 w-11 shrink-0 rounded-full bg-line-strong transition-colors after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-brand-primary peer-checked:after:translate-x-5 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-ring peer-focus-visible:ring-offset-2"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Save to my Reusable Library
              </span>
              <span className="mt-0.5 block text-xs text-ink-secondary">
                Keep this lesson available to duplicate into another class.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className={`${surfaceCard} p-6`}>
        <h2 className="text-lg font-semibold">Materials</h2>
        {props.mode === "create" ? (
          <p className="mt-1 text-sm text-ink-secondary">
            Save the lesson, then add a file or a link.
          </p>
        ) : (
          <LessonMaterials
            lessonId={props.lesson.id}
            materials={props.materials}
            file={selectedFile}
            onFileChange={setSelectedFile}
            onUploadFile={uploadSelectedFile}
            uploadingFile={uploadingFile}
          />
        )}
      </section>

      <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-6">
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={form.formState.isSubmitting || uploadingFile}
            onClick={() => {
              publishRef.current = false;
            }}
            className={buttonSecondary}
          >
            {saveLabel}
          </button>

          <button
            type="submit"
            disabled={form.formState.isSubmitting || uploadingFile}
            onClick={() => {
              publishRef.current = true;
            }}
            className={buttonPrimary}
          >
            {uploadingFile ? "Uploading file..." : "Publish Lesson"}
          </button>
        </div>
      </div>
    </form>
  );
}
