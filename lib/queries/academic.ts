/**
 * Read academic structure through the caller's Supabase client.
 * RLS applies the JWT tenant_id. Do not filter tenant_id here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AcademicYear,
  Class,
  ClassSubject,
  Subject,
  Term,
} from "@/lib/types/academic";

type QueryError = { message: string };

const YEAR_COLUMNS =
  "id, tenant_id, name, start_date, end_date, is_current, created_at";
const TERM_COLUMNS =
  "id, tenant_id, academic_year_id, name, start_date, end_date, is_current, created_at";
const CLASS_COLUMNS = "id, tenant_id, name, grade_level, created_at";
const SUBJECT_COLUMNS = "id, tenant_id, name, created_at";
const CLASS_SUBJECT_COLUMNS = "id, tenant_id, class_id, subject_id, created_at";

function unwrap<T>(
  table: string,
  result: { data: T[] | null; error: QueryError | null },
): T[] {
  if (result.error) {
    throw new Error(`${table}: ${result.error.message}`);
  }
  return result.data ?? [];
}

export async function getAcademicYears(
  supabase: SupabaseClient,
): Promise<AcademicYear[]> {
  const result = await supabase
    .from("academic_years")
    .select(YEAR_COLUMNS)
    .order("start_date", { ascending: false })
    .returns<AcademicYear[]>();
  return unwrap("academic_years", result);
}

export async function getTerms(
  supabase: SupabaseClient,
  yearId: string,
): Promise<Term[]> {
  const result = await supabase
    .from("terms")
    .select(TERM_COLUMNS)
    .eq("academic_year_id", yearId)
    .order("start_date", { ascending: true })
    .returns<Term[]>();
  return unwrap("terms", result);
}

export async function getClasses(supabase: SupabaseClient): Promise<Class[]> {
  const result = await supabase
    .from("classes")
    .select(CLASS_COLUMNS)
    .order("name", { ascending: true })
    .returns<Class[]>();
  return unwrap("classes", result);
}

export async function getSubjects(
  supabase: SupabaseClient,
): Promise<Subject[]> {
  const result = await supabase
    .from("subjects")
    .select(SUBJECT_COLUMNS)
    .order("name", { ascending: true })
    .returns<Subject[]>();
  return unwrap("subjects", result);
}

export async function getClassSubjects(
  supabase: SupabaseClient,
  classId: string,
): Promise<ClassSubject[]> {
  const result = await supabase
    .from("class_subjects")
    .select(CLASS_SUBJECT_COLUMNS)
    .eq("class_id", classId)
    .order("created_at", { ascending: true })
    .returns<ClassSubject[]>();
  return unwrap("class_subjects", result);
}

export function todayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function academicYearStatus(
  year: AcademicYear,
  today = todayIso(),
): string {
  if (year.is_current) return "Current";
  if (year.end_date < today) return "Past";
  if (year.start_date > today) return "Upcoming";
  return "Not current";
}

export function termStatus(term: Term, today = todayIso()): string {
  if (term.is_current) return "Current";
  if (term.end_date < today) return "Past";
  if (term.start_date > today) return "Upcoming";
  return "Not current";
}

/** Class names linked to each subject. Callers pass rows already loaded by the query functions. */
export function classNamesBySubjectId(
  classes: Class[],
  links: ClassSubject[],
): Map<string, string[]> {
  const nameById = new Map(classes.map((row) => [row.id, row.name]));
  const grouped = new Map<string, string[]>();

  for (const link of links) {
    const name = nameById.get(link.class_id);
    if (!name) continue;
    const names = grouped.get(link.subject_id);
    if (names) {
      names.push(name);
    } else {
      grouped.set(link.subject_id, [name]);
    }
  }

  for (const names of grouped.values()) {
    names.sort((left, right) => left.localeCompare(right));
  }

  return grouped;
}
