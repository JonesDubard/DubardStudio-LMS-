"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createAcademicYear, updateAcademicYear } from "../../actions";
import {
  FieldError,
  FormActions,
  ServerError,
  inputClass,
  labelClass,
} from "../../_components/FormControls";
import {
  academicYearSchema,
  type AcademicYearInput,
} from "@/lib/academic/schema";

export function YearForm({
  mode,
  yearId,
  defaultValues,
  onDone,
}: {
  mode: "create" | "edit";
  yearId?: string;
  defaultValues: AcademicYearInput;
  onDone: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<AcademicYearInput>({
    resolver: zodResolver(academicYearSchema),
    defaultValues,
  });

  async function onSubmit(values: AcademicYearInput) {
    setServerError(null);
    const result =
      mode === "create"
        ? await createAcademicYear(values)
        : await updateAcademicYear(yearId ?? "", values);
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
        <label htmlFor="year-name" className={labelClass}>
          Name
        </label>
        <input
          id="year-name"
          className={inputClass}
          placeholder="2027–2028"
          aria-invalid={form.formState.errors.name ? true : undefined}
          {...form.register("name")}
        />
        <FieldError message={form.formState.errors.name?.message} />
      </div>
      <div>
        <label htmlFor="year-start" className={labelClass}>
          Start date
        </label>
        <input
          id="year-start"
          type="date"
          className={inputClass}
          aria-invalid={form.formState.errors.start_date ? true : undefined}
          {...form.register("start_date")}
        />
        <FieldError message={form.formState.errors.start_date?.message} />
      </div>
      <div>
        <label htmlFor="year-end" className={labelClass}>
          End date
        </label>
        <input
          id="year-end"
          type="date"
          className={inputClass}
          aria-invalid={form.formState.errors.end_date ? true : undefined}
          {...form.register("end_date")}
        />
        <FieldError message={form.formState.errors.end_date?.message} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("is_current")} />
        Mark as current
      </label>
      <FormActions pending={form.formState.isSubmitting} label="Save" />
    </form>
  );
}
