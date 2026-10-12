"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  classSubjectSchema,
  type ClassSubjectInput,
} from "@/lib/academic/schema";
import { createClassSubject } from "../../actions";
import {
  FieldError,
  FormActions,
  ServerError,
  inputClass,
  labelClass,
} from "../../_components/FormControls";

type Option = { id: string; name: string };

export function LinkSubjectForm({
  classes,
  subjects,
  defaultValues,
  onDone,
}: {
  classes: Option[];
  subjects: Option[];
  defaultValues: ClassSubjectInput;
  onDone: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ClassSubjectInput>({
    resolver: zodResolver(classSubjectSchema),
    defaultValues,
  });

  async function onSubmit(values: ClassSubjectInput) {
    setServerError(null);
    const result = await createClassSubject(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
    >
      <ServerError message={serverError} />
      <div>
        <label htmlFor="link-subject" className={labelClass}>
          Subject
        </label>
        <select
          id="link-subject"
          className={inputClass}
          aria-invalid={form.formState.errors.subject_id ? true : undefined}
          {...form.register("subject_id")}
        >
          <option value="">Select a subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        <FieldError message={form.formState.errors.subject_id?.message} />
      </div>
      <div>
        <label htmlFor="link-class" className={labelClass}>
          Class
        </label>
        <select
          id="link-class"
          className={inputClass}
          aria-invalid={form.formState.errors.class_id ? true : undefined}
          {...form.register("class_id")}
        >
          <option value="">Select a class</option>
          {classes.map((schoolClass) => (
            <option key={schoolClass.id} value={schoolClass.id}>
              {schoolClass.name}
            </option>
          ))}
        </select>
        <FieldError message={form.formState.errors.class_id?.message} />
      </div>
      <FormActions pending={form.formState.isSubmitting} label="Link" />
    </form>
  );
}
