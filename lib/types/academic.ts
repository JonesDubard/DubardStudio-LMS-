/** Row shapes for supabase/migrations/0002_academic_structure.sql. Names match the columns. */

export type AcademicYear = {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
};

export type Term = {
  id: string;
  tenant_id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
};

export type Class = {
  id: string;
  tenant_id: string;
  name: string;
  grade_level: string | null;
  created_at: string;
};

export type Subject = {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
};

export type ClassSubject = {
  id: string;
  tenant_id: string;
  class_id: string;
  subject_id: string;
  created_at: string;
};
