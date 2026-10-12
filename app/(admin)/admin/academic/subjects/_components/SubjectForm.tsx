"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { subjectSchema, type SubjectInput } from "@/lib/academic/schema";
import { createSubject, updateSubject } from "../../actions";
import {
  FieldError,
  FormActions,
  ServerError,
  inputClass,
  labelClass,
} from "../../_components/FormControls";

export function SubjectForm({
  mode,
  subjectId,
  defaultValues,
  onDone,
}: {
  mode: "create" | "edit";
  subjectId?: string;
  defaultValues: SubjectInput;
  onDone: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<SubjectInput>({
    resolver: zodResolver(subjectSchema),
    defaultValues,
  });

  async function onSubmit(values: SubjectInput) {
    setServerError(null);
    const result =
      mode === "create"
        ? await createSubject(values)
        : await updateSubject(subjectId ?? "", values);
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
        <label htmlFor="subject-name" className={labelClass}>
          Name
        </label>
        <input
          id="subject-name"
          className={inputClass}
          aria-invalid={form.formState.errors.name ? true : undefined}
          {...form.register("name")}
        />
        <FieldError message={form.formState.errors.name?.message} />
      </div>
      <FormActions pending={form.formState.isSubmitting} label="Save" />
    </form>
  );
}
