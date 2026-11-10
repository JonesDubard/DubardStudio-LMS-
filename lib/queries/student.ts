/**
 * Student feed and lesson reads.
 * RLS applies the JWT tenant and the student's enrollments.
 * Do not filter student_id or tenant_id here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type QueryError = { message: string };

const FEED_LIMIT = 20;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StudentFeedLesson = {
  kind: "lesson";
  id: string;
  eyebrow: string;
  title: string;
  meta: string;
  description: string;
  actionLabel: string;
  at: string;
};

export type StudentFeedAssignment = {
  kind: "assignment";
  id: string;
  eyebrow: string;
  title: string;
  meta: string;
  badge: string;
  actionLabel: string;
  at: string;
};

export type StudentFeedItem = StudentFeedLesson | StudentFeedAssignment;

export type StudentFeed = {
  enrolled: boolean;
  eyebrow: string;
  greeting: string;
  todayLabel: string;
  todayDate: string;
  items: StudentFeedItem[];
  recentlyViewedLabel: string;
  recentlyViewedCountLabel: string;
  recentlyViewed: [];
};

export type StudentLessonSummary = {
  id: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  className: string;
  subjectName: string;
  courseName: string | null;
};

export type StudentLessonMaterial = {
  id: string;
  kind: string;
  name: string;
  sizeBytes: number | null;
  externalUrl: string | null;
};

export type StudentLessonDetails = {
  id: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  className: string;
  subjectName: string;
  courseName: string | null;
  materials: StudentLessonMaterial[];
};

type EnrollmentRow = {
  class_id: string;
  academic_year_id: string;
  status: string;
};

type ClassSubjectRow = {
  id: string;
  class_id: string;
  subject_id: string;
};

type CourseRow = {
  id: string;
  class_subject_id: string;
  term_id: string;
  name: string | null;
};

type TermRow = { id: string; academic_year_id: string };
type NamedRow = { id: string; name: string };

type EnrolledCourse = {
  id: string;
  classId: string;
  className: string;
  subjectName: string;
  courseName: string | null;
};

type LessonRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  published_at: string | null;
  created_at: string;
};

type AssessmentRow = {
  id: string;
  course_id: string;
  title: string;
  due_date: string | null;
  published_at: string | null;
};

type MaterialRow = {
  id: string;
  kind: string;
  file_id: string | null;
  external_url: string | null;
  sort_order: number;
};

type FileRow = {
  id: string;
  original_name: string;
  size_bytes: number;
  mime_type: string;
};

function unwrap<T>(
  table: string,
  result: { data: T[] | null; error: QueryError | null },
): T[] {
  if (result.error) {
    throw new Error(`${table}: ${result.error.message}`);
  }
  return result.data ?? [];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function greetingFor(name: string, now: Date): string {
  const hour = now.getHours();
  const hello =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name.trim().split(/\s+/)[0];
  return first ? `${hello}, ${first}` : hello;
}

function formatToday(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(now);
}

function formatDue(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isTomorrow(value: string, now: Date): boolean {
  const due = new Date(value);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return due >= start && due < end;
}

function dueSoon(value: string, now: Date): boolean {
  const due = new Date(value).getTime();
  const delta = due - now.getTime();
  return delta >= 0 && delta <= 2 * 24 * 60 * 60 * 1000;
}

async function studentDisplayName(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`auth: ${error.message}`);
  if (!data.user) return "";

  const result = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.user.id)
    .maybeSingle<{ full_name: string | null }>();
  if (result.error) throw new Error(`profiles: ${result.error.message}`);
  return result.data?.full_name ?? "";
}

/**
 * Courses for the signed-in student's active enrollments.
 * RLS already limits enrollments to that student and courses to the tenant.
 */
async function enrolledCourses(
  supabase: SupabaseClient,
): Promise<{ enrolled: boolean; courses: EnrolledCourse[] }> {
  const enrollmentResult = await supabase
    .from("enrollments")
    .select("class_id, academic_year_id, status")
    .eq("status", "active")
    .returns<EnrollmentRow[]>();
  const enrollments = unwrap("enrollments", enrollmentResult);
  if (enrollments.length === 0) return { enrolled: false, courses: [] };

  const classIds = unique(enrollments.map((row) => row.class_id));
  const classSubjectResult = await supabase
    .from("class_subjects")
    .select("id, class_id, subject_id")
    .in("class_id", classIds)
    .returns<ClassSubjectRow[]>();
  const classSubjects = unwrap("class_subjects", classSubjectResult);
  if (classSubjects.length === 0) return { enrolled: true, courses: [] };

  const courseResult = await supabase
    .from("courses")
    .select("id, class_subject_id, term_id, name")
    .in(
      "class_subject_id",
      classSubjects.map((row) => row.id),
    )
    .returns<CourseRow[]>();
  const courses = unwrap("courses", courseResult);
  if (courses.length === 0) return { enrolled: true, courses: [] };

  const termResult = await supabase
    .from("terms")
    .select("id, academic_year_id")
    .in(
      "id",
      unique(courses.map((row) => row.term_id)),
    )
    .returns<TermRow[]>();
  const terms = unwrap("terms", termResult);

  const classResult = await supabase
    .from("classes")
    .select("id, name")
    .in("id", classIds)
    .returns<NamedRow[]>();
  const classes = unwrap("classes", classResult);

  const subjectResult = await supabase
    .from("subjects")
    .select("id, name")
    .in(
      "id",
      unique(classSubjects.map((row) => row.subject_id)),
    )
    .returns<NamedRow[]>();
  const subjects = unwrap("subjects", subjectResult);

  const classSubjectById = new Map(classSubjects.map((row) => [row.id, row]));
  const termYearById = new Map(terms.map((row) => [row.id, row.academic_year_id]));
  const classNameById = new Map(classes.map((row) => [row.id, row.name]));
  const subjectNameById = new Map(subjects.map((row) => [row.id, row.name]));
  const yearsByClass = new Map<string, Set<string>>();
  for (const enrollment of enrollments) {
    const years = yearsByClass.get(enrollment.class_id) ?? new Set<string>();
    years.add(enrollment.academic_year_id);
    yearsByClass.set(enrollment.class_id, years);
  }

  const matched: EnrolledCourse[] = [];
  for (const course of courses) {
    const classSubject = classSubjectById.get(course.class_subject_id);
    const yearId = termYearById.get(course.term_id);
    if (!classSubject || !yearId) continue;
    if (!yearsByClass.get(classSubject.class_id)?.has(yearId)) continue;
    matched.push({
      id: course.id,
      classId: classSubject.class_id,
      className: classNameById.get(classSubject.class_id) ?? "Class",
      subjectName: subjectNameById.get(classSubject.subject_id) ?? "Subject",
      courseName: course.name,
    });
  }

  return { enrolled: true, courses: matched };
}

export async function getStudentFeed(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<StudentFeed> {
  const [{ enrolled, courses }, displayName] = await Promise.all([
    enrolledCourses(supabase),
    studentDisplayName(supabase),
  ]);

  const shell: StudentFeed = {
    enrolled,
    eyebrow: "Student Home",
    greeting: greetingFor(displayName, now),
    todayLabel: "TODAY",
    todayDate: formatToday(now),
    items: [],
    recentlyViewedLabel: "RECENTLY VIEWED",
    recentlyViewedCountLabel: "0 lessons",
    recentlyViewed: [],
  };
  if (!enrolled || courses.length === 0) return shell;

  const courseIds = courses.map((course) => course.id);
  const courseById = new Map(courses.map((course) => [course.id, course]));

  const lessonResult = await supabase
    .from("lessons")
    .select("id, course_id, title, description, published_at, created_at")
    .in("course_id", courseIds)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(FEED_LIMIT)
    .returns<LessonRow[]>();
  const lessons = unwrap("lessons", lessonResult);

  const assessmentResult = await supabase
    .from("assessments")
    .select("id, course_id, title, due_date, published_at")
    .in("course_id", courseIds)
    .eq("status", "published")
    .eq("type", "assignment")
    .order("due_date", { ascending: false })
    .limit(FEED_LIMIT)
    .returns<AssessmentRow[]>();
  const assessments = unwrap("assessments", assessmentResult).filter((row) => {
    if (!row.due_date) return true;
    return new Date(row.due_date).getTime() >= now.getTime();
  });

  const items: StudentFeedItem[] = [];

  for (const lesson of lessons) {
    const course = courseById.get(lesson.course_id);
    if (!course) continue;
    const at = lesson.published_at ?? lesson.created_at;
    items.push({
      kind: "lesson",
      id: lesson.id,
      eyebrow: "New Lesson",
      title: `${course.subjectName} — ${lesson.title}`,
      meta: `${course.className} · ${course.subjectName}`,
      description: lesson.description ?? "",
      actionLabel: "Open Lesson",
      at,
    });
  }

  for (const assessment of assessments) {
    const course = courseById.get(assessment.course_id);
    if (!course) continue;
    const at = assessment.due_date ?? assessment.published_at ?? "";
    const dueLabel = assessment.due_date
      ? `Due ${formatDue(assessment.due_date)}`
      : "No due date";
    items.push({
      kind: "assignment",
      id: assessment.id,
      eyebrow:
        assessment.due_date && isTomorrow(assessment.due_date, now)
          ? "Assignment Due Tomorrow"
          : "Assignment",
      title: assessment.title,
      meta: `${course.subjectName} · ${dueLabel}`,
      badge:
        assessment.due_date && dueSoon(assessment.due_date, now)
          ? "DUE SOON"
          : "UPCOMING",
      actionLabel: "Open Assignment",
      at,
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  shell.items = items.slice(0, FEED_LIMIT);
  return shell;
}

export async function getStudentLessons(
  supabase: SupabaseClient,
  classId: string,
): Promise<StudentLessonSummary[]> {
  if (!isUuid(classId)) return [];
  const { courses } = await enrolledCourses(supabase);
  const forClass = courses.filter((course) => course.classId === classId);
  if (forClass.length === 0) return [];

  const courseById = new Map(forClass.map((course) => [course.id, course]));
  const result = await supabase
    .from("lessons")
    .select("id, course_id, title, description, published_at, created_at")
    .in(
      "course_id",
      forClass.map((course) => course.id),
    )
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false })
    .returns<LessonRow[]>();
  const lessons = unwrap("lessons", result);

  return lessons.flatMap((lesson) => {
    const course = courseById.get(lesson.course_id);
    if (!course) return [];
    return [
      {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        publishedAt: lesson.published_at,
        className: course.className,
        subjectName: course.subjectName,
        courseName: course.courseName,
      },
    ];
  });
}

export async function getLessonDetails(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<StudentLessonDetails | null> {
  if (!isUuid(lessonId)) return null;

  const lessonResult = await supabase
    .from("lessons")
    .select("id, course_id, title, description, published_at")
    .eq("id", lessonId)
    .eq("status", "published")
    .maybeSingle<{
      id: string;
      course_id: string;
      title: string;
      description: string | null;
      published_at: string | null;
    }>();
  if (lessonResult.error) {
    throw new Error(`lessons: ${lessonResult.error.message}`);
  }
  const lesson = lessonResult.data;
  if (!lesson) return null;

  const courseResult = await supabase
    .from("courses")
    .select("id, class_subject_id, name")
    .eq("id", lesson.course_id)
    .maybeSingle<{
      id: string;
      class_subject_id: string;
      name: string | null;
    }>();
  if (courseResult.error) {
    throw new Error(`courses: ${courseResult.error.message}`);
  }

  let className = "Class";
  let subjectName = "Subject";
  const courseName = courseResult.data?.name ?? null;
  if (courseResult.data) {
    const classSubjectResult = await supabase
      .from("class_subjects")
      .select("class_id, subject_id")
      .eq("id", courseResult.data.class_subject_id)
      .maybeSingle<{ class_id: string; subject_id: string }>();
    if (classSubjectResult.error) {
      throw new Error(`class_subjects: ${classSubjectResult.error.message}`);
    }
    const classSubject = classSubjectResult.data;
    if (classSubject) {
      const [classResult, subjectResult] = await Promise.all([
        supabase
          .from("classes")
          .select("name")
          .eq("id", classSubject.class_id)
          .maybeSingle<{ name: string }>(),
        supabase
          .from("subjects")
          .select("name")
          .eq("id", classSubject.subject_id)
          .maybeSingle<{ name: string }>(),
      ]);
      if (classResult.error) throw new Error(`classes: ${classResult.error.message}`);
      if (subjectResult.error) {
        throw new Error(`subjects: ${subjectResult.error.message}`);
      }
      className = classResult.data?.name ?? className;
      subjectName = subjectResult.data?.name ?? subjectName;
    }
  }

  const materialResult = await supabase
    .from("lesson_materials")
    .select("id, kind, file_id, external_url, sort_order")
    .eq("lesson_id", lesson.id)
    .order("sort_order", { ascending: true })
    .returns<MaterialRow[]>();
  const materials = unwrap("lesson_materials", materialResult);

  const fileIds = unique(
    materials.flatMap((row) => (row.file_id ? [row.file_id] : [])),
  );
  const fileById = new Map<string, FileRow>();
  if (fileIds.length > 0) {
    const fileResult = await supabase
      .from("files")
      .select("id, original_name, size_bytes, mime_type")
      .in("id", fileIds)
      .returns<FileRow[]>();
    for (const file of unwrap("files", fileResult)) {
      fileById.set(file.id, file);
    }
  }

  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    publishedAt: lesson.published_at,
    className,
    subjectName,
    courseName,
    materials: materials.map((material) => {
      const file = material.file_id ? fileById.get(material.file_id) : undefined;
      return {
        id: material.id,
        kind: material.kind,
        name: file?.original_name ?? material.external_url ?? "Material",
        sizeBytes: file ? Number(file.size_bytes) : null,
        externalUrl: material.external_url,
      };
    }),
  };
}

export type StudentClass = {
  id: string;
  name: string;
  yearName: string;
};

export type StudentGrade = {
  id: string;
  title: string;
  scoreLabel: string;
  feedback: string | null;
};

export type StudentGradeGroup = {
  heading: string;
  grades: StudentGrade[];
};

function scoreLabel(score: number | string | null, max: number | string | null): string {
  const value = score === null || score === "" ? null : Number(score);
  const maximum = max === null || max === "" ? null : Number(max);
  if (value === null || !Number.isFinite(value)) return "—";
  const shown = Number.isInteger(value) ? String(value) : String(value);
  if (maximum === null || !Number.isFinite(maximum)) return shown;
  return `${shown} / ${maximum}`;
}

/** Active classes for the signed-in student. RLS limits enrollments to that student. */
export async function getStudentClasses(
  supabase: SupabaseClient,
): Promise<StudentClass[]> {
  const enrollmentResult = await supabase
    .from("enrollments")
    .select("class_id, academic_year_id")
    .eq("status", "active")
    .returns<{ class_id: string; academic_year_id: string }[]>();
  const enrollments = unwrap("enrollments", enrollmentResult);
  if (enrollments.length === 0) return [];

  const classIds = unique(enrollments.map((row) => row.class_id));
  const yearIds = unique(enrollments.map((row) => row.academic_year_id));
  const [classResult, yearResult] = await Promise.all([
    supabase.from("classes").select("id, name").in("id", classIds).returns<NamedRow[]>(),
    supabase
      .from("academic_years")
      .select("id, name")
      .in("id", yearIds)
      .returns<NamedRow[]>(),
  ]);
  const className = new Map(unwrap("classes", classResult).map((row) => [row.id, row.name]));
  const yearName = new Map(
    unwrap("academic_years", yearResult).map((row) => [row.id, row.name]),
  );

  const seen = new Set<string>();
  const classes: StudentClass[] = [];
  for (const enrollment of enrollments) {
    const key = `${enrollment.class_id}:${enrollment.academic_year_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    classes.push({
      id: key,
      name: className.get(enrollment.class_id) ?? "Class",
      yearName: yearName.get(enrollment.academic_year_id) ?? "Year",
    });
  }
  return classes.sort((a, b) => a.name.localeCompare(b.name) || a.yearName.localeCompare(b.yearName));
}

/** Released grades for the signed-in student, grouped by class and subject. */
export async function getStudentGradeGroups(
  supabase: SupabaseClient,
): Promise<StudentGradeGroup[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(`auth: ${userError.message}`);
  if (!userData.user) return [];

  const gradeResult = await supabase
    .from("grades")
    .select("id, assessment_id, score, feedback, released_at")
    .eq("student_id", userData.user.id)
    .not("released_at", "is", null)
    .order("released_at", { ascending: false })
    .returns<
      {
        id: string;
        assessment_id: string;
        score: number | string | null;
        feedback: string | null;
      }[]
    >();
  const grades = unwrap("grades", gradeResult);
  if (grades.length === 0) return [];

  const assessmentResult = await supabase
    .from("assessments")
    .select("id, course_id, title, max_score")
    .in(
      "id",
      unique(grades.map((grade) => grade.assessment_id)),
    )
    .returns<
      { id: string; course_id: string; title: string; max_score: number | string | null }[]
    >();
  const assessments = unwrap("assessments", assessmentResult);
  const assessmentById = new Map(assessments.map((row) => [row.id, row]));
  const { courses } = await enrolledCourses(supabase);
  const courseById = new Map(courses.map((course) => [course.id, course]));

  const groups = new Map<string, StudentGrade[]>();
  for (const grade of grades) {
    const assessment = assessmentById.get(grade.assessment_id);
    const course = assessment ? courseById.get(assessment.course_id) : undefined;
    const heading = course ? `${course.className} · ${course.subjectName}` : "Class";
    const feedback = grade.feedback?.trim() ?? "";
    const item: StudentGrade = {
      id: grade.id,
      title: assessment?.title ?? "Assessment",
      scoreLabel: scoreLabel(grade.score, assessment?.max_score ?? null),
      feedback: feedback.length > 0 ? feedback : null,
    };
    const list = groups.get(heading) ?? [];
    list.push(item);
    groups.set(heading, list);
  }

  return [...groups.entries()].map(([heading, items]) => ({ heading, grades: items }));
}
