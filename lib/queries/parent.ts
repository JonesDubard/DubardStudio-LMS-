/**
 * Parent reads. RLS limits rows to the signed-in parent's linked children.
 * Do not filter tenant_id here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type QueryError = { message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ParentChild = {
  id: string;
  name: string;
};

export type ParentAssignment = {
  id: string;
  title: string;
  subjectName: string;
  dueLabel: string;
  status: "upcoming" | "overdue";
};

export type ParentGrade = {
  id: string;
  title: string;
  subjectName: string;
  scoreLabel: string;
  feedback: string | null;
};

export type ParentView = {
  greeting: string;
  children: ParentChild[];
  selected: ParentChild | null;
  upcoming: ParentAssignment[];
  overdue: ParentAssignment[];
  grades: ParentGrade[];
};

type EnrollmentRow = {
  class_id: string;
  academic_year_id: string;
};

type ClassSubjectRow = { id: string; class_id: string; subject_id: string };
type CourseRow = { id: string; class_subject_id: string; term_id: string };
type TermRow = { id: string; academic_year_id: string };
type NamedRow = { id: string; name: string };

type AssessmentRow = {
  id: string;
  course_id: string;
  title: string;
  due_date: string | null;
  max_score: number | string | null;
};

type GradeRow = {
  id: string;
  assessment_id: string;
  score: number | string | null;
  feedback: string | null;
  released_at: string | null;
};

function unwrap<T>(
  table: string,
  result: { data: T[] | null; error: QueryError | null },
): T[] {
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
  return result.data ?? [];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function asNumber(value: number | string | null): number | null {
  if (value === null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatScore(score: number | null, max: number | null): string {
  if (score === null) return "—";
  const shown = Number.isInteger(score) ? String(score) : String(score);
  return max === null ? shown : `${shown} / ${max}`;
}

function formatDue(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function greetingFor(name: string, now: Date): string {
  const hour = now.getHours();
  const hello =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name.trim().split(/\s+/)[0];
  return first ? `${hello}, ${first}` : hello;
}

function pickChild(children: ParentChild[], requested: string | undefined): ParentChild | null {
  if (children.length === 0) return null;
  if (requested && UUID_RE.test(requested)) {
    const match = children.find((child) => child.id === requested);
    if (match) return match;
  }
  return children[0];
}

async function parentDisplayName(supabase: SupabaseClient): Promise<string> {
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

async function linkedChildren(supabase: SupabaseClient): Promise<ParentChild[]> {
  const linkResult = await supabase
    .from("parent_children")
    .select("student_id")
    .returns<{ student_id: string }[]>();
  const links = unwrap("parent_children", linkResult);
  if (links.length === 0) return [];

  const profileResult = await supabase
    .from("profiles")
    .select("id, full_name")
    .in(
      "id",
      unique(links.map((link) => link.student_id)),
    )
    .returns<{ id: string; full_name: string | null }[]>();
  const profiles = unwrap("profiles", profileResult);
  const nameById = new Map(profiles.map((row) => [row.id, row.full_name?.trim() || "Student"]));

  return links
    .map((link) => ({
      id: link.student_id,
      name: nameById.get(link.student_id) ?? "Student",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function subjectByCourse(
  supabase: SupabaseClient,
  studentId: string,
): Promise<Map<string, string>> {
  const enrollmentResult = await supabase
    .from("enrollments")
    .select("class_id, academic_year_id")
    .eq("student_id", studentId)
    .eq("status", "active")
    .returns<EnrollmentRow[]>();
  const enrollments = unwrap("enrollments", enrollmentResult);
  if (enrollments.length === 0) return new Map();

  const classIds = unique(enrollments.map((row) => row.class_id));
  const classSubjectResult = await supabase
    .from("class_subjects")
    .select("id, class_id, subject_id")
    .in("class_id", classIds)
    .returns<ClassSubjectRow[]>();
  const classSubjects = unwrap("class_subjects", classSubjectResult);
  if (classSubjects.length === 0) return new Map();

  const courseResult = await supabase
    .from("courses")
    .select("id, class_subject_id, term_id")
    .in(
      "class_subject_id",
      classSubjects.map((row) => row.id),
    )
    .returns<CourseRow[]>();
  const courses = unwrap("courses", courseResult);
  if (courses.length === 0) return new Map();

  const termResult = await supabase
    .from("terms")
    .select("id, academic_year_id")
    .in(
      "id",
      unique(courses.map((row) => row.term_id)),
    )
    .returns<TermRow[]>();
  const terms = unwrap("terms", termResult);

  const subjectResult = await supabase
    .from("subjects")
    .select("id, name")
    .in(
      "id",
      unique(classSubjects.map((row) => row.subject_id)),
    )
    .returns<NamedRow[]>();
  const subjects = unwrap("subjects", subjectResult);

  const yearsByClass = new Map<string, Set<string>>();
  for (const enrollment of enrollments) {
    const years = yearsByClass.get(enrollment.class_id) ?? new Set<string>();
    years.add(enrollment.academic_year_id);
    yearsByClass.set(enrollment.class_id, years);
  }

  const classSubjectById = new Map(classSubjects.map((row) => [row.id, row]));
  const termYearById = new Map(terms.map((row) => [row.id, row.academic_year_id]));
  const subjectNameById = new Map(subjects.map((row) => [row.id, row.name]));
  const subjectByCourseId = new Map<string, string>();

  for (const course of courses) {
    const classSubject = classSubjectById.get(course.class_subject_id);
    const yearId = termYearById.get(course.term_id);
    if (!classSubject || !yearId) continue;
    if (!yearsByClass.get(classSubject.class_id)?.has(yearId)) continue;
    subjectByCourseId.set(
      course.id,
      subjectNameById.get(classSubject.subject_id) ?? "Subject",
    );
  }

  return subjectByCourseId;
}

async function assignmentsFor(
  supabase: SupabaseClient,
  studentId: string,
  now: Date,
): Promise<{ upcoming: ParentAssignment[]; overdue: ParentAssignment[] }> {
  const subjects = await subjectByCourse(supabase, studentId);
  const courseIds = [...subjects.keys()];
  if (courseIds.length === 0) return { upcoming: [], overdue: [] };

  const result = await supabase
    .from("assessments")
    .select("id, course_id, title, due_date, max_score")
    .in("course_id", courseIds)
    .eq("status", "published")
    .returns<AssessmentRow[]>();
  const rows = unwrap("assessments", result);

  const upcoming: ParentAssignment[] = [];
  const overdue: ParentAssignment[] = [];
  const sorted = [...rows].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  for (const row of sorted) {
    const overdueWork = row.due_date !== null && new Date(row.due_date).getTime() < now.getTime();
    const item: ParentAssignment = {
      id: row.id,
      title: row.title,
      subjectName: subjects.get(row.course_id) ?? "Subject",
      dueLabel: row.due_date ? `Due ${formatDue(row.due_date)}` : "No due date",
      status: overdueWork ? "overdue" : "upcoming",
    };
    if (overdueWork) overdue.push(item);
    else upcoming.push(item);
  }

  return { upcoming, overdue };
}

async function gradesFor(supabase: SupabaseClient, studentId: string): Promise<ParentGrade[]> {
  const gradeResult = await supabase
    .from("grades")
    .select("id, assessment_id, score, feedback, released_at")
    .eq("student_id", studentId)
    .not("released_at", "is", null)
    .order("released_at", { ascending: false })
    .returns<GradeRow[]>();
  const grades = unwrap("grades", gradeResult);
  if (grades.length === 0) return [];

  const assessmentResult = await supabase
    .from("assessments")
    .select("id, course_id, title, due_date, max_score")
    .in(
      "id",
      unique(grades.map((grade) => grade.assessment_id)),
    )
    .returns<AssessmentRow[]>();
  const assessments = unwrap("assessments", assessmentResult);
  const assessmentById = new Map(assessments.map((row) => [row.id, row]));
  const subjects = await subjectByCourse(supabase, studentId);

  return grades.map((grade) => {
    const assessment = assessmentById.get(grade.assessment_id);
    const feedback = grade.feedback?.trim() ?? "";
    return {
      id: grade.id,
      title: assessment?.title ?? "Assessment",
      subjectName: assessment
        ? (subjects.get(assessment.course_id) ?? "Subject")
        : "Subject",
      scoreLabel: formatScore(asNumber(grade.score), asNumber(assessment?.max_score ?? null)),
      feedback: feedback.length > 0 ? feedback : null,
    };
  });
}

export async function getParentView(
  supabase: SupabaseClient,
  childId: string | undefined,
  now = new Date(),
): Promise<ParentView> {
  const [children, displayName] = await Promise.all([
    linkedChildren(supabase),
    parentDisplayName(supabase),
  ]);
  const selected = pickChild(children, childId);
  const greeting = greetingFor(displayName, now);
  if (!selected) {
    return { greeting, children, selected: null, upcoming: [], overdue: [], grades: [] };
  }

  const [{ upcoming, overdue }, grades] = await Promise.all([
    assignmentsFor(supabase, selected.id, now),
    gradesFor(supabase, selected.id),
  ]);

  return { greeting, children, selected, upcoming, overdue, grades };
}
