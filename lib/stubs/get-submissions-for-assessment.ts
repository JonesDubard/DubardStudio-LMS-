import type { Assessment } from "@/lib/stubs/get-assignment-for-edit";

export interface SubmissionListItem {
  id: string;
  studentName: string;
  status: "PENDING" | "GRADED";
  meta: string;
  selected: boolean;
}

export interface SubmissionDetail {
  id: string;
  studentName: string;
  className: string;
  submittedAt: string;
  writtenAnswer: string;
  fileName: string;
  fileMeta: string;
  score: string;
  maxScore: number;
  feedback: string;
}

export interface SubmissionsForAssessment {
  assessment: Assessment;
  eyebrow: string;
  pendingLabel: string;
  listTitle: string;
  listSubtitle: string;
  submissions: SubmissionListItem[];
  selected: SubmissionDetail;
}

export function getSubmissionsForAssessment(
  assessmentId: string,
): SubmissionsForAssessment {
  return {
    assessment: {
      id: assessmentId,
      type: "assignment",
      title: "Reading Response",
      instructions: "",
      dueLabel: "Friday 20 Sept",
      maxScore: 20,
      className: "JSS 2A",
      subject: "English Language",
      lessonTitle: "",
    },
    eyebrow: "Grading / Assignment Submission",
    pendingLabel: "12 PENDING",
    listTitle: "Student Submissions",
    listSubtitle: "12 submissions received.",
    submissions: [
      {
        id: "1",
        studentName: "Amara Johnson",
        status: "PENDING",
        meta: "Submitted 19 Sept, 6:42 PM",
        selected: true,
      },
      {
        id: "2",
        studentName: "David Cooper",
        status: "PENDING",
        meta: "Submitted 19 Sept, 7:10 PM",
        selected: false,
      },
      {
        id: "3",
        studentName: "Martha Kromah",
        status: "GRADED",
        meta: "Score: 17 / 20",
        selected: false,
      },
    ],
    selected: {
      id: "1",
      studentName: "Amara Johnson",
      className: "JSS 2A",
      submittedAt: "Submitted 19 Sept, 6:42 PM",
      writtenAnswer:
        "The main idea of the passage is that education gives young people the knowledge and skills needed to improve their communities.",
      fileName: "Reading Response.pdf",
      fileMeta: "PDF · 420 KB",
      score: "17",
      maxScore: 20,
      feedback:
        "Good response. Your main idea is clearly explained. Add one example from the passage to strengthen your answer.",
    },
  };
}
