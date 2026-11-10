/**
 * Teacher lesson reads. RLS applies the JWT tenant_id. Do not filter tenant_id here.
 * Assigned courses come from teacher_assignments.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Course,
  Lesson,
  LessonListItem,
  LessonStatus,
  TeacherCourse,
} from "@/lib/types/lessons";
import type { ClassSubject } from "@/lib/types/academic";

type QueryError = { message: string };

const COURSE_COLUMNS =
  "id, tenant_id, class_subject_id, term_id, name, created_at";
const LESSON_COLUMNS =
  "id, tenant_id, course_id, title, description, status, published_at, created_by, created_at, updated_at";
const CLASS_SUBJECT_COLUMNS = "id, class_id, subject_id";
const NAMED_COLUMNS = "id, name";

const LESSON_STATUSES: LessonStatus[] = ["draft", "published", "archived"];

export type LessonListFilters = {
  teacherId: string;
  classId?: string;
  subjectId?: string;
  termId?: string;
  status?: LessonStatus;
  limit?: number;
};

type NamedRow = { id: string; name: string };

function unwrap<T>(
  table: string,
  result: { data: T[] | null; error: QueryError | null },
): T[] {
  if (result.error) {
    throw new Error(`${table}: ${result.error.message}`);
  }
  return result.data ?? [];
}

function lessonStatus(value: string): LessonStatus {
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }
  throw new Error(`lessons: unexpected status ${value}`);
}

export function parseLessonStatus(
  value: string | undefined,
): LessonStatus | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (LESSON_STATUSES.includes(normalized as LessonStatus)) {
    return normalized as LessonStatus;
  }
  return undefined;
}

export async function getSignedInTeacherId(
  supabase: SupabaseClient,
): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`auth: ${error.message}`);
  if (!data.user) throw new Error("You need to sign in again.");
  return data.user.id;
}

async function rowsById(
  supabase: SupabaseClient,
  table: "classes" | "subjects" | "terms",
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const result = await supabase
    .from(table)
    .select(NAMED_COLUMNS)
    .in("id", ids)
    .returns<NamedRow[]>();
  const rows = unwrap(table, result);
  return new Map(rows.map((row) => [row.id, row.name]));
}

/** class_subject ids from teacher_assignments. RLS returns this teacher's rows. */
async function assignedClassSubjectIds(
  supabase: SupabaseClient,
): Promise<string[] | null> {
  const result = await supabase
    .from("teacher_assignments")
    .select("class_subject_id");
  if (result.error) {
    const message = result.error.message.toLowerCase();
    if (
      message.includes("does not exist") ||
      message.includes("schema cache") ||
      result.error.code === "PGRST205"
    ) {
      return null;
    }
    throw new Error(`teacher_assignments: ${result.error.message}`);
  }
  return [
    ...new Set(
      (result.data ?? []).map(
        (row) => (row as { class_subject_id: string }).class_subject_id,
      ),
    ),
  ];
}

export async function getTeacherCourses(
  supabase: SupabaseClient,
): Promise<TeacherCourse[]> {
  const classSubjectIds = await assignedClassSubjectIds(supabase);
  if (!classSubjectIds || classSubjectIds.length === 0) return [];
  const courseQuery = supabase
    .from("courses")
    .select(COURSE_COLUMNS)
    .in("class_subject_id", classSubjectIds)
    .order("created_at", { ascending: true });

  const courses = unwrap("courses", await courseQuery.returns<Course[]>());
  if (courses.length === 0) return [];

  const linkIds = [
    ...new Set(courses.map((course) => course.class_subject_id)),
  ];
  const linkResult = await supabase
    .from("class_subjects")
    .select(CLASS_SUBJECT_COLUMNS)
    .in("id", linkIds)
    .returns<Pick<ClassSubject, "id" | "class_id" | "subject_id">[]>();
  const links = unwrap("class_subjects", linkResult);
  const linkById = new Map(links.map((link) => [link.id, link]));

  const classNames = await rowsById(supabase, "classes", [
    ...new Set(links.map((link) => link.class_id)),
  ]);
  const subjectNames = await rowsById(supabase, "subjects", [
    ...new Set(links.map((link) => link.subject_id)),
  ]);
  const termNames = await rowsById(supabase, "terms", [
    ...new Set(courses.map((course) => course.term_id)),
  ]);

  return courses.map((course) => {
    const link = linkById.get(course.class_subject_id);
    const className = link ? classNames.get(link.class_id) : undefined;
    const subjectName = link ? subjectNames.get(link.subject_id) : undefined;
    const termName = termNames.get(course.term_id);
    if (!link || !className || !subjectName || !termName) {
      throw new Error(
        `courses: class, subject, or term was not found for course ${course.id}`,
      );
    }
    return {
      ...course,
      class_id: link.class_id,
      class_name: className,
      subject_id: link.subject_id,
      subject_name: subjectName,
      term_name: termName,
    };
  });
}

function matchingCourses(
  courses: TeacherCourse[],
  filters: LessonListFilters,
): TeacherCourse[] {
  return courses.filter((course) => {
    if (filters.classId && course.class_id !== filters.classId) return false;
    if (filters.subjectId && course.subject_id !== filters.subjectId) {
      return false;
    }
    if (filters.termId && course.term_id !== filters.termId) return false;
    return true;
  });
}

type LessonListRow = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  course_id: string;
};

export async function getTeacherLessons(
  supabase: SupabaseClient,
  filters: LessonListFilters,
): Promise<LessonListItem[]> {
  const courses = matchingCourses(
    await getTeacherCourses(supabase),
    filters,
  );
  if (courses.length === 0) return [];

  let query = supabase
    .from("lessons")
    .select("id, title, status, updated_at, course_id")
    .in(
      "course_id",
      courses.map((course) => course.id),
    )
    .order("updated_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.limit && filters.limit > 0) query = query.limit(filters.limit);

  const rows = unwrap("lessons", await query.returns<LessonListRow[]>());
  const courseById = new Map(courses.map((course) => [course.id, course]));

  return rows.map((row) => {
    const course = courseById.get(row.course_id);
    if (!course) {
      throw new Error(
        `lessons: course ${row.course_id} was not in the teacher's courses`,
      );
    }
    return {
      id: row.id,
      title: row.title,
      status: lessonStatus(row.status),
      course_name: course.name,
      class_name: course.class_name,
      subject_name: course.subject_name,
      updated_at: row.updated_at,
    };
  });
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getLessonById(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<Lesson | null> {
  if (!UUID_PATTERN.test(lessonId)) return null;
  const result = await supabase
    .from("lessons")
    .select(LESSON_COLUMNS)
    .eq("id", lessonId)
    .maybeSingle()
    .returns<Lesson>();
  if (result.error) throw new Error(`lessons: ${result.error.message}`);
  if (!result.data) return null;
  return { ...result.data, status: lessonStatus(result.data.status) };
}

/**
 * Lessons for one course. RLS scopes the tenant. Teacher lists should use
 * getTeacherLessons so course assignment applies.
 */
export async function getLessonsForCourse(
  supabase: SupabaseClient,
  courseId: string,
): Promise<Lesson[]> {
  const result = await supabase
    .from("lessons")
    .select(LESSON_COLUMNS)
    .eq("course_id", courseId)
    .order("updated_at", { ascending: false })
    .returns<Lesson[]>();
  return unwrap("lessons", result).map((lesson) => ({
    ...lesson,
    status: lessonStatus(lesson.status),
  }));
}

export type LessonMaterialItem = {
  id: string;
  name: string;
};

export async function getLessonMaterials(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<LessonMaterialItem[]> {
  const result = await supabase
    .from("lesson_materials")
    .select("id, file_id, external_url, sort_order")
    .eq("lesson_id", lessonId)
    .order("sort_order", { ascending: true })
    .returns<{ id: string; file_id: string | null; external_url: string | null }[]>();
  const rows = unwrap("lesson_materials", result);
  const fileIds = rows.flatMap((row) => (row.file_id ? [row.file_id] : []));
  const names = new Map<string, string>();
  if (fileIds.length > 0) {
    const files = await supabase
      .from("files")
      .select("id, original_name")
      .in("id", fileIds)
      .returns<{ id: string; original_name: string }[]>();
    for (const file of unwrap("files", files)) names.set(file.id, file.original_name);
  }
  return rows.map((row) => ({
    id: row.id,
    name: (row.file_id && names.get(row.file_id)) || row.external_url || "Material",
  }));
}
