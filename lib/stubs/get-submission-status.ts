export interface SubmissionStatus {
  assignmentId: string;
  subject: string;
  headerTitle: string;
  confirmationTitle: string;
  confirmationDetail: string;
  summaryLabel: string;
  title: string;
  submittedLabel: string;
  submittedAt: string;
  dueLabel: string;
  dueValue: string;
  statusLabel: string;
  statusBadge: string;
  workTitle: string;
  answerLabel: string;
  answer: string;
  attachmentName: string;
  attachmentMeta: string;
  attachmentState: string;
  reviewLabel: string;
  reviewState: string;
  reviewDetail: string;
  backLabel: string;
}

export function getSubmissionStatus(assignmentId: string): SubmissionStatus {
  return {
    assignmentId,
    subject: "English",
    headerTitle: "Submission Status",
    confirmationTitle: "Work Submitted",
    confirmationDetail:
      "Your submission for English — Reading Response has been received.",
    summaryLabel: "Assignment",
    title: "English — Reading Response",
    submittedLabel: "Submitted",
    submittedAt: "Sep 23, 1:42 PM",
    dueLabel: "Due Date",
    dueValue: "Sep 24, 8:00 PM",
    statusLabel: "Status",
    statusBadge: "SUBMITTED",
    workTitle: "Submitted Work",
    answerLabel: "Written Answer",
    answer:
      "The main idea of the passage is that communities can solve problems by working together and sharing responsibility.",
    attachmentName: "Reading Response.pdf",
    attachmentMeta: "Submitted attachment",
    attachmentState: "ATTACHED",
    reviewLabel: "Submission Status",
    reviewState: "Waiting for teacher review",
    reviewDetail:
      "Your score and teacher feedback will appear when they are released.",
    backLabel: "Back to Learning Feed",
  };
}
