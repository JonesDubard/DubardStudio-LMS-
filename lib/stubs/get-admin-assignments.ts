export interface AssignmentFilterOption {
  value: string;
  label: string;
}

export interface AssignmentFilterField {
  id: string;
  label: string;
  options: AssignmentFilterOption[];
}

export interface AdminAssignmentRow {
  id: string;
  title: string;
  teacher: string;
  className: string;
  dueDate: string;
  submissions: string;
  graded: string;
  actionLabel: string;
}

export interface AdminAssignments {
  schoolName: string;
  portalLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  filters: AssignmentFilterField[];
  assignments: AdminAssignmentRow[];
}

export function getAdminAssignments(): AdminAssignments {
  return {
    schoolName: "Pilot School #1",
    portalLabel: "School Admin",
    eyebrow: "Content / Assignments",
    title: "Assignments Overview",
    subtitle: "View assignments published across the school.",
    filters: [
      {
        id: "class",
        label: "Class",
        options: [
          { value: "all", label: "All Classes" },
          { value: "jss-2a", label: "JSS 2A" },
          { value: "jss-2b", label: "JSS 2B" },
          { value: "jss-3a", label: "JSS 3A" },
        ],
      },
      {
        id: "teacher",
        label: "Teacher",
        options: [
          { value: "all", label: "All Teachers" },
          { value: "abena", label: "Mrs. Abena Kollie" },
          { value: "samuel", label: "Mr. Samuel Cooper" },
          { value: "martha", label: "Mrs. Martha Kromah" },
        ],
      },
      {
        id: "term",
        label: "Term",
        options: [
          { value: "all", label: "All Terms" },
          { value: "term-1", label: "Term 1" },
          { value: "term-2", label: "Term 2" },
          { value: "term-3", label: "Term 3" },
        ],
      },
    ],
    assignments: [
      {
        id: "1",
        title: "Reading Response",
        teacher: "Mrs. Abena Kollie",
        className: "JSS 2A",
        dueDate: "20 Sept 2026",
        submissions: "26 / 32",
        graded: "18 / 26",
        actionLabel: "View",
      },
      {
        id: "2",
        title: "Fractions Practice",
        teacher: "Mrs. Abena Kollie",
        className: "JSS 2B",
        dueDate: "23 Sept 2026",
        submissions: "21 / 29",
        graded: "9 / 21",
        actionLabel: "View",
      },
      {
        id: "3",
        title: "Science Observation Notes",
        teacher: "Mr. Samuel Cooper",
        className: "JSS 3A",
        dueDate: "25 Sept 2026",
        submissions: "28 / 31",
        graded: "28 / 28",
        actionLabel: "View",
      },
    ],
  };
}
