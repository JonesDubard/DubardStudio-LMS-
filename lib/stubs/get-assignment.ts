export interface AssignmentMaterial {
  name: string;
  meta: string;
  actionLabel: string;
}

export interface Assignment {
  id: string;
  subject: string;
  headerTitle: string;
  category: string;
  title: string;
  dueLabel: string;
  dueValue: string;
  badge: string;
  instructionsTitle: string;
  instructions: string;
  materialsTitle: string;
  material: AssignmentMaterial;
  submissionTitle: string;
  answerLabel: string;
  answerPlaceholder: string;
  attachLabel: string;
  attachEmpty: string;
  attachAction: string;
  submitLabel: string;
  statusLabel: string;
}

export function getAssignment(assignmentId: string): Assignment {
  return {
    id: assignmentId,
    subject: "English",
    headerTitle: "Assignment",
    category: "Reading & Writing",
    title: "English — Reading Response",
    dueLabel: "Due Date",
    dueValue: "September 24, 8:00 PM",
    badge: "DUE SOON",
    instructionsTitle: "Instructions",
    instructions:
      "Read the assigned passage and write a short response explaining the main idea. Use two details from the passage to support your answer.",
    materialsTitle: "Materials",
    material: {
      name: "Reading Passage.pdf",
      meta: "PDF material",
      actionLabel: "Download",
    },
    submissionTitle: "Your Submission",
    answerLabel: "Write Answer",
    answerPlaceholder: "Write your answer here...",
    attachLabel: "Attach File",
    attachEmpty: "No file selected",
    attachAction: "Choose File",
    submitLabel: "Submit Work",
    statusLabel: "Submission Status",
  };
}
