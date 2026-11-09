import { z } from "zod";
import { ASSESSMENT_TYPES } from "@/lib/types/assessments";

export const createAssessmentSchema = z
  .object({
    lessonId: z.string().uuid("Choose a lesson."),
    title: z.string().trim().min(1, "Title is required.").max(200),
    type: z.enum(ASSESSMENT_TYPES),
    dueDate: z.string(),
    maxScore: z.string(),
    publish: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.type !== "assignment" && value.maxScore.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxScore"],
        message: "Max score is required for a quiz, test, or exam.",
      });
    }
    if (value.maxScore.trim() !== "" && Number(value.maxScore) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxScore"],
        message: "Max score must be greater than 0.",
      });
    }
  });

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
