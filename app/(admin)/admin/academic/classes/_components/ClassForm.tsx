"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { classSchema, type ClassInput } from "@/lib/academic/schema";
import { createClass, updateClass } from "../../actions";
import {
  FieldError,
  FormActions,
  ServerError,
  inputClass,
  labelClass,
} from "../../_components/FormControls";

export function ClassForm({
  mode,
  classId,
  defaultValues,
  onDone,
}: {
  mode: "create" | "edit";
  classId?: string;
  defaultValues: ClassInput;
  onDone: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ClassInput>({
    resolver: zodResolver(classSchema),
    defaultValues,
  });

  async function onSubmit(values: ClassInput) {
    setServerError(null);
    const result =
      mode === "create"
        ? await createClass(values)
        : await updateClass(classId ?? "", values);
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
        <label htmlFor="class-name" className={labelClass}>
          Name
        </label>
        <input
          id="class-name"
          className={inputClass}
          aria-invalid={form.formState.errors.name ? true : undefined}
          {...form.register("name")}
        />
        <FieldError message={form.formState.errors.name?.message} />
      </div>
      <div>
        <label htmlFor="class-grade" className={labelClass}>
          Grade level
        </label>
        <input
          id="class-grade"
          className={inputClass}
          {...form.register("grade_level")}
        />
        <p className="mt-1 text-sm text-[#666666]">
          Optional. Leave blank if this class has no separate grade label.
        </p>
      </div>
      <FormActions pending={form.formState.isSubmitting} label="Save" />
    </form>
  );
}
