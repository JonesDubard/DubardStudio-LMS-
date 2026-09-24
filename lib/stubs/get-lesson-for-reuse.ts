export interface ReuseTermOption {
  label: string;
}

export interface LessonForReuse {
  id: string;
  eyebrow: string;
  title: string;
  meta: string;
  publishedLabel: string;
  description: string;
  panelEyebrow: string;
  panelTitle: string;
  panelSubtitle: string;
  selectedAction: "duplicate" | "carry-forward";
  terms: ReuseTermOption[];
  selectedTerm: string;
  draftTitle: string;
  draftClass: string;
  draftTerm: string;
}

export function getLessonForReuse(lessonId: string): LessonForReuse {
  return {
    id: lessonId,
    eyebrow: "Lessons / My Lessons",
    title: "Adding and Subtracting Fractions",
    meta: "Mathematics · JSS 2A · Term 1 — 2025/2026",
    publishedLabel: "Published Lesson",
    description:
      "Students will learn how to add and subtract fractions with common and unlike denominators.",
    panelEyebrow: "Lesson Reuse",
    panelTitle: "Reuse this lesson",
    panelSubtitle:
      "Create a new draft from this lesson for another term or academic year.",
    selectedAction: "duplicate",
    terms: [
      { label: "Term 1 — 2026/2027" },
      { label: "Term 2 — 2026/2027" },
      { label: "Term 3 — 2026/2027" },
    ],
    selectedTerm: "Term 1 — 2026/2027",
    draftTitle: "Adding and Subtracting Fractions",
    draftClass: "JSS 2A",
    draftTerm: "Term 1 — 2026/2027",
  };
}
