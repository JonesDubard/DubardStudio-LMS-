import type { AssessmentType } from "@/lib/stubs/get-teacher-home";

export interface Assessment {
  id: string;
  type: AssessmentType;
  title: string;
  instructions: string;
  dueLabel: string;
  maxScore: number | null;
  className: string;
  subject: string;
  lessonTitle: string;
}

export interface AssignmentMaterial {
  name: string;
  meta: string;
  actionLabel: string;
}

export interface AssignmentForEdit {
  assessment: Assessment;
  eyebrow: string;
  pageTitle: string;
  subtitle: string;
  material: AssignmentMaterial;
}

export function getAssignmentForEdit(assignmentId: string): AssignmentForEdit {
  return {
    assessment: {
      id: assignmentId,
      type: "assignment",
      title: "Fractions Practice",
      instructions:
        "Complete questions 1–10 in your exercise book. Show each step used to reach your answer.",
      dueLabel: "Friday 20 September, 8:00 PM",
      maxScore: null,
      className: "JSS 2A",
      subject: "Mathematics",
      lessonTitle: "Adding and Subtracting Fractions",
    },
    eyebrow: "Lessons / Adding and Subtracting Fractions / Assignment",
    pageTitle: "Create Assignment",
    subtitle: "Linked to the lesson for students in JSS 2A.",
    material: {
      name: "Fractions Practice.pdf",
      meta: "PDF · 850 KB",
      actionLabel: "Choose File",
    },
  };
}
