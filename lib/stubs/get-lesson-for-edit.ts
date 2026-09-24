export interface LessonMaterialDraft {
  name: string;
  meta: string;
  actionLabel: string;
}

export interface LessonForEdit {
  id: string;
  status: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  classOptions: string[];
  selectedClass: string;
  subjectOptions: string[];
  selectedSubject: string;
  termOptions: string[];
  selectedTerm: string;
  lessonTitle: string;
  description: string;
  materials: LessonMaterialDraft[];
  videoUrl: string;
}

export function getLessonForEdit(lessonId: string): LessonForEdit {
  return {
    id: lessonId,
    status: "DRAFT",
    eyebrow: "Lessons / Create Lesson",
    title: "Create Lesson",
    subtitle: "Build a lesson for your selected class and subject.",
    classOptions: ["JSS 2A", "JSS 2B"],
    selectedClass: "JSS 2A",
    subjectOptions: ["Mathematics", "English Language"],
    selectedSubject: "Mathematics",
    termOptions: ["Term 1 — 2026/2027", "Term 2 — 2026/2027"],
    selectedTerm: "Term 1 — 2026/2027",
    lessonTitle: "Adding and Subtracting Fractions",
    description:
      "Students will learn how to add and subtract fractions with common and unlike denominators.",
    materials: [
      {
        name: "Fractions Practice.pdf",
        meta: "PDF · 1.2 MB",
        actionLabel: "Choose File",
      },
      {
        name: "Example Fractions.docx",
        meta: "Document · 420 KB",
        actionLabel: "Replace",
      },
    ],
    videoUrl: "https://www.example.com/fractions-week-3",
  };
}
