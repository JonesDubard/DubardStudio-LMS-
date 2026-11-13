export const ASSESSMENT_TYPES = ["assignment", "quiz", "test", "exam"] as const;

export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export type AssessmentStatus = "draft" | "published" | "archived";

export type TeacherAssessment = {
  id: string;
  courseId: string;
  lessonId: string | null;
  type: AssessmentType;
  title: string;
  instructions: string | null;
  dueDate: string | null;
  maxScore: number | null;
  status: AssessmentStatus;
  publishedAt: string | null;
};

export type SubmissionGradeView = {
  id: string;
  studentId: string;
  studentName: string;
  text: string | null;
  fileName: string | null;
  submittedAt: string;
  status: string;
  score: number | null;
  feedback: string | null;
  releasedAt: string | null;
};

export type GradeRosterRow = {
  studentId: string;
  studentName: string;
  score: string;
  feedback: string;
  releasedAt: string | null;
};

export type GradeInput = {
  studentId: string;
  score: string;
  feedback: string;
};
