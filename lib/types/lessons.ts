/** Row shapes for supabase/migrations/0003_content.sql. Names match the columns. */

export type LessonStatus = "draft" | "published" | "archived";

export type Course = {
  id: string;
  tenant_id: string;
  class_subject_id: string;
  term_id: string;
  name: string | null;
  created_at: string;
};

/** A course plus the class, subject, and term names needed by teacher screens. */
export type TeacherCourse = Course & {
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  term_name: string;
};

export type Lesson = {
  id: string;
  tenant_id: string;
  course_id: string;
  title: string;
  description: string | null;
  status: LessonStatus;
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type LessonListItem = {
  id: string;
  title: string;
  status: LessonStatus;
  course_name: string | null;
  class_name: string;
  subject_name: string;
  updated_at: string;
};
