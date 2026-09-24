import type { Assessment } from "@/lib/stubs/get-assignment-for-edit";

export interface GradeEntryRow {
  id: string;
  indexLabel: string;
  studentName: string;
  score: string;
  comment: string;
}

export interface GradeEntryRoster {
  assessment: Assessment;
  eyebrow: string;
  title: string;
  classLabel: string;
  typeLabel: string;
  maxScoreLabel: string;
  studentCountLabel: string;
  lastSavedLabel: string;
  lastSavedAt: string;
  rows: GradeEntryRow[];
}

export function getGradeEntryRoster(assessmentId: string): GradeEntryRoster {
  return {
    assessment: {
      id: assessmentId,
      type: "quiz",
      title: "Mathematics — Week 3 Quiz",
      instructions: "",
      dueLabel: "",
      maxScore: 20,
      className: "JSS 2B",
      subject: "Mathematics",
      lessonTitle: "",
    },
    eyebrow: "Grading / Score Entry",
    title: "Mathematics — Week 3 Quiz",
    classLabel: "Class: JSS 2B",
    typeLabel: "Quiz",
    maxScoreLabel: "20",
    studentCountLabel: "29 STUDENTS",
    lastSavedLabel: "Last saved",
    lastSavedAt: "17 September, 10:42 AM",
    rows: [
      {
        id: "1",
        indexLabel: "01",
        studentName: "Amara Johnson",
        score: "18",
        comment: "Strong understanding.",
      },
      {
        id: "2",
        indexLabel: "02",
        studentName: "David Cooper",
        score: "15",
        comment: "Review fractions with unlike denominators.",
      },
      {
        id: "3",
        indexLabel: "03",
        studentName: "Martha Kromah",
        score: "19",
        comment: "Excellent work.",
      },
    ],
  };
}
