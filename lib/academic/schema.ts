import { z } from "zod";

export type ActionResult = { ok: true } | { ok: false; error: string };

const requiredName = z.string().trim().min(1, "Name is required.");

export const academicYearSchema = z
  .object({
    name: requiredName,
    start_date: z.string().min(1, "Start date is required."),
    end_date: z.string().min(1, "End date is required."),
    is_current: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (
      value.start_date &&
      value.end_date &&
      value.end_date <= value.start_date
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "End date must be after the start date.",
      });
    }
  });

export type AcademicYearInput = z.infer<typeof academicYearSchema>;

export const emptyAcademicYear: AcademicYearInput = {
  name: "",
  start_date: "",
  end_date: "",
  is_current: false,
};

export const termSchema = z
  .object({
    academic_year_id: z.string().uuid("Choose an academic year."),
    name: requiredName,
    start_date: z.string().min(1, "Start date is required."),
    end_date: z.string().min(1, "End date is required."),
    is_current: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (
      value.start_date &&
      value.end_date &&
      value.end_date <= value.start_date
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "End date must be after the start date.",
      });
    }
  });

export type TermInput = z.infer<typeof termSchema>;

export type YearBounds = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

/** Shared by the term form and the Server Action. */
export function termOutsideYearMessage(
  term: { start_date: string; end_date: string },
  year: { name?: string; start_date: string; end_date: string },
): string | null {
  if (!term.start_date || !term.end_date) return null;
  if (term.end_date <= term.start_date) return null;
  if (term.start_date < year.start_date || term.end_date > year.end_date) {
    const label = year.name
      ? `${year.name} (${year.start_date} to ${year.end_date})`
      : `${year.start_date} to ${year.end_date}`;
    return `Dates must fall within the academic year ${label}.`;
  }
  return null;
}

export function termFormSchema(years: YearBounds[]) {
  return termSchema.superRefine((value, ctx) => {
    const year = years.find((row) => row.id === value.academic_year_id);
    if (!year) return;
    const message = termOutsideYearMessage(value, year);
    if (!message) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end_date"],
      message,
    });
  });
}

export const classSchema = z.object({
  name: requiredName,
  grade_level: z.string().trim(),
});

export type ClassInput = z.infer<typeof classSchema>;

export const emptyClass: ClassInput = {
  name: "",
  grade_level: "",
};

export const subjectSchema = z.object({
  name: requiredName,
});

export type SubjectInput = z.infer<typeof subjectSchema>;

export const emptySubject: SubjectInput = {
  name: "",
};

export const classSubjectSchema = z.object({
  class_id: z.string().uuid("Choose a class."),
  subject_id: z.string().uuid("Choose a subject."),
});

export type ClassSubjectInput = z.infer<typeof classSubjectSchema>;

export function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}
