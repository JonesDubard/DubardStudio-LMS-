/**
 * Course assignment until migration 0005b adds teacher_assignments.
 *
 * The pilot teacher is assigned to every course the session can read.
 * RLS already limits that read to their tenant. Other teachers in the
 * same tenant are assigned to no courses unless their email is listed here.
 *
 * Course UUIDs are not stored. Seed generates them.
 */
export const PILOT_TEACHER_EMAIL = "teacher@pilotschool.test";

export const ASSIGNED_TEACHER_EMAILS = [PILOT_TEACHER_EMAIL] as const;

export function isStubAssignedTeacher(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return ASSIGNED_TEACHER_EMAILS.some((assigned) => assigned === normalized);
}

export const NO_CLASSES_ASSIGNED_MESSAGE =
  "You don't have classes assigned yet. Ask your School Admin to assign you to a class.";
