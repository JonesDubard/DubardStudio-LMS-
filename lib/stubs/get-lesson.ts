export interface LessonMaterial {
  name: string;
  meta: string;
  actionLabel: string;
  tone: "solid" | "outline";
}

export interface Lesson {
  id: string;
  subject: string;
  headerTitle: string;
  weekLabel: string;
  title: string;
  meta: string;
  paragraphs: string[];
  contentLabel: string;
  structureTitle: string;
  structureDetail: string;
  structureStatus: string;
  imageLabel: string;
  imagePreview: string;
  imageCaption: string;
  imageAction: string;
  materialsLabel: string;
  materials: LessonMaterial[];
  offlineTitle: string;
  offlineDetail: string;
  backLabel: string;
}

export function getLesson(lessonId: string): Lesson {
  return {
    id: lessonId,
    subject: "Mathematics",
    headerTitle: "Lesson",
    weekLabel: "Week 3",
    title: "Adding and Subtracting Fractions",
    meta: "Mathematics · Published Sep 23",
    paragraphs: [
      "To add or subtract fractions with different denominators, first find a common denominator. Then convert each fraction before completing the calculation.",
      "Example: 1/2 + 1/4 becomes 2/4 + 1/4, which equals 3/4.",
    ],
    contentLabel: "Lesson Content",
    structureTitle: "Lesson structure",
    structureDetail: "Examples and key points available",
    structureStatus: "READY",
    imageLabel: "Lesson Image",
    imagePreview: "Compressed image preview",
    imageCaption: "Fractions diagram",
    imageAction: "View Image",
    materialsLabel: "Materials",
    materials: [
      {
        name: "Fractions Practice.pdf",
        meta: "PDF · Available on demand",
        actionLabel: "Download PDF",
        tone: "solid",
      },
      {
        name: "Lesson Video",
        meta: "External video link",
        actionLabel: "Watch Video ↗",
        tone: "outline",
      },
    ],
    offlineTitle: "Recently Viewed",
    offlineDetail:
      "This lesson is available in your recently viewed lessons for offline access.",
    backLabel: "Back to Learning Feed",
  };
}
