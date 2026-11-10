import type { SupabaseClient } from "@supabase/supabase-js";

type QueryError = { message: string };

export type ContentLesson = {
  id: string;
  title: string;
  status: string;
  className: string;
  subjectName: string;
};

export type ContentAssessment = {
  id: string;
  title: string;
  type: string;
  status: string;
  dueDate: string | null;
  className: string;
  subjectName: string;
};

export type AdminLessonView = {
  id: string;
  title: string;
  status: string;
  description: string | null;
  publishedAt: string | null;
  className: string;
  subjectName: string;
  materials: { id: string; name: string }[];
};

export type AdminAssessmentView = {
  id: string;
  title: string;
  type: string;
  status: string;
  instructions: string | null;
  dueDate: string | null;
  maxScore: number | null;
  className: string;
  subjectName: string;
};

function unwrap<T>(table: string, result: { data: T[] | null; error: QueryError | null }): T[] {
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
  return result.data ?? [];
}

type CoursePlacement = { className: string; subjectName: string };

async function placements(
  supabase: SupabaseClient,
  courseIds: string[],
): Promise<Map<string, CoursePlacement>> {
  const map = new Map<string, CoursePlacement>();
  if (courseIds.length === 0) return map;
  const courseResult = await supabase
    .from("courses")
    .select("id, class_subject_id")
    .in("id", courseIds)
    .returns<{ id: string; class_subject_id: string }[]>();
  const courses = unwrap("courses", courseResult);
  const linkIds = [...new Set(courses.map((row) => row.class_subject_id))];
  if (linkIds.length === 0) return map;
  const linkResult = await supabase
    .from("class_subjects")
    .select("id, class_id, subject_id")
    .in("id", linkIds)
    .returns<{ id: string; class_id: string; subject_id: string }[]>();
  const links = unwrap("class_subjects", linkResult);
  const classIds = [...new Set(links.map((row) => row.class_id))];
  const subjectIds = [...new Set(links.map((row) => row.subject_id))];
  const [classResult, subjectResult] = await Promise.all([
    supabase.from("classes").select("id, name").in("id", classIds).returns<{ id: string; name: string }[]>(),
    supabase.from("subjects").select("id, name").in("id", subjectIds).returns<{ id: string; name: string }[]>(),
  ]);
  const className = new Map(unwrap("classes", classResult).map((row) => [row.id, row.name]));
  const subjectName = new Map(unwrap("subjects", subjectResult).map((row) => [row.id, row.name]));
  const linkById = new Map(links.map((row) => [row.id, row]));
  for (const course of courses) {
    const link = linkById.get(course.class_subject_id);
    map.set(course.id, {
      className: link ? (className.get(link.class_id) ?? "Class") : "Class",
      subjectName: link ? (subjectName.get(link.subject_id) ?? "Subject") : "Subject",
    });
  }
  return map;
}

export async function listSchoolLessons(supabase: SupabaseClient): Promise<ContentLesson[]> {
  const result = await supabase
    .from("lessons")
    .select("id, title, status, course_id")
    .order("title", { ascending: true })
    .returns<{ id: string; title: string; status: string; course_id: string }[]>();
  const rows = unwrap("lessons", result);
  const place = await placements(supabase, [...new Set(rows.map((row) => row.course_id))]);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    className: place.get(row.course_id)?.className ?? "Class",
    subjectName: place.get(row.course_id)?.subjectName ?? "Subject",
  }));
}

export async function listSchoolAssessments(
  supabase: SupabaseClient,
): Promise<ContentAssessment[]> {
  const result = await supabase
    .from("assessments")
    .select("id, title, type, status, due_date, course_id")
    .order("title", { ascending: true })
    .returns<
      {
        id: string;
        title: string;
        type: string;
        status: string;
        due_date: string | null;
        course_id: string;
      }[]
    >();
  const rows = unwrap("assessments", result);
  const place = await placements(supabase, [...new Set(rows.map((row) => row.course_id))]);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    dueDate: row.due_date,
    className: place.get(row.course_id)?.className ?? "Class",
    subjectName: place.get(row.course_id)?.subjectName ?? "Subject",
  }));
}

export async function getAdminLesson(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<AdminLessonView | null> {
  const lessonResult = await supabase
    .from("lessons")
    .select("id, title, status, description, published_at, course_id")
    .eq("id", lessonId)
    .maybeSingle<{
      id: string;
      title: string;
      status: string;
      description: string | null;
      published_at: string | null;
      course_id: string;
    }>();
  if (lessonResult.error) throw new Error(`lessons: ${lessonResult.error.message}`);
  if (!lessonResult.data) return null;
  const lesson = lessonResult.data;
  const place = await placements(supabase, [lesson.course_id]);
  const materialResult = await supabase
    .from("lesson_materials")
    .select("id, file_id, external_url, sort_order")
    .eq("lesson_id", lesson.id)
    .order("sort_order", { ascending: true })
    .returns<{ id: string; file_id: string | null; external_url: string | null }[]>();
  const materials = unwrap("lesson_materials", materialResult);
  const fileIds = materials.flatMap((row) => (row.file_id ? [row.file_id] : []));
  const fileNames = new Map<string, string>();
  if (fileIds.length > 0) {
    const fileResult = await supabase
      .from("files")
      .select("id, original_name")
      .in("id", fileIds)
      .returns<{ id: string; original_name: string }[]>();
    for (const file of unwrap("files", fileResult)) fileNames.set(file.id, file.original_name);
  }
  return {
    id: lesson.id,
    title: lesson.title,
    status: lesson.status,
    description: lesson.description,
    publishedAt: lesson.published_at,
    className: place.get(lesson.course_id)?.className ?? "Class",
    subjectName: place.get(lesson.course_id)?.subjectName ?? "Subject",
    materials: materials.map((material) => ({
      id: material.id,
      name: (material.file_id && fileNames.get(material.file_id)) || material.external_url || "Material",
    })),
  };
}

export async function getAdminAssessment(
  supabase: SupabaseClient,
  assessmentId: string,
): Promise<AdminAssessmentView | null> {
  const result = await supabase
    .from("assessments")
    .select("id, title, type, status, instructions, due_date, max_score, course_id")
    .eq("id", assessmentId)
    .maybeSingle<{
      id: string;
      title: string;
      type: string;
      status: string;
      instructions: string | null;
      due_date: string | null;
      max_score: number | string | null;
      course_id: string;
    }>();
  if (result.error) throw new Error(`assessments: ${result.error.message}`);
  if (!result.data) return null;
  const row = result.data;
  const place = await placements(supabase, [row.course_id]);
  const maxScore = row.max_score === null || row.max_score === "" ? null : Number(row.max_score);
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    instructions: row.instructions,
    dueDate: row.due_date,
    maxScore: maxScore !== null && Number.isFinite(maxScore) ? maxScore : null,
    className: place.get(row.course_id)?.className ?? "Class",
    subjectName: place.get(row.course_id)?.subjectName ?? "Subject",
  };
}
