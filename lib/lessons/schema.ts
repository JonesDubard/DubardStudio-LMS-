import { z } from "zod";

const titleField = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(200, "Title must be 200 characters or fewer.");

const descriptionField = z
  .string()
  .trim()
  .max(5000, "Description must be 5000 characters or fewer.");

/** Title and description. Shared by the lesson form and the Server Actions. */
export const lessonContentSchema = z.object({
  title: titleField,
  description: descriptionField,
});

export type LessonContentInput = z.infer<typeof lessonContentSchema>;

export const createLessonSchema = lessonContentSchema.extend({
  course_id: z.string().uuid("Choose a course."),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;

export const emptyLessonContent: LessonContentInput = {
  title: "",
  description: "",
};
