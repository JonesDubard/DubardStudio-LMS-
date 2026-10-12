"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  termFormSchema,
  type TermInput,
  type YearBounds,
} from "@/lib/academic/schema";
import { createTerm, updateTerm } from "../../actions";
import {
  FieldError,
  FormActions,
  ServerError,
  inputClass,
  labelClass,
} from "../../_components/FormControls";

export function TermForm({
  mode,
  termId,
  years,
  defaultValues,
  onDone,
}: {
  mode: "create" | "edit";
  termId?: string;
  years: YearBounds[];
  defaultValues: TermInput;
  onDone: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => termFormSchema(years), [years]);
  const form = useForm<TermInput>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  async function onSubmit(values: TermInput) {
    setServerError(null);
    const result =
      mode === "create"
        ? await createTerm(values)
        : await updateTerm(termId ?? "", values);
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
      {years.length === 0 ? (
        <p className="text-sm text-[#666666]">Create an academic year first.</p>
      ) : null}
      <div>
        <label htmlFor="term-year" className={labelClass}>
          Academic year
        </label>
        <select
          id="term-year"
          className={inputClass}
          aria-invalid={
            form.formState.errors.academic_year_id ? true : undefined
          }
          {...form.register("academic_year_id")}
        >
          <option value="">Select a year</option>
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name} ({year.start_date} to {year.end_date})
            </option>
          ))}
        </select>
        <FieldError message={form.formState.errors.academic_year_id?.message} />
      </div>
      <div>
        <label htmlFor="term-name" className={labelClass}>
          Name
        </label>
        <input
          id="term-name"
          className={inputClass}
          aria-invalid={form.formState.errors.name ? true : undefined}
          {...form.register("name")}
        />
        <FieldError message={form.formState.errors.name?.message} />
      </div>
      <div>
        <label htmlFor="term-start" className={labelClass}>
          Start date
        </label>
        <input
          id="term-start"
          type="date"
          className={inputClass}
          aria-invalid={form.formState.errors.start_date ? true : undefined}
          {...form.register("start_date")}
        />
        <FieldError message={form.formState.errors.start_date?.message} />
      </div>
      <div>
        <label htmlFor="term-end" className={labelClass}>
          End date
        </label>
        <input
          id="term-end"
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
