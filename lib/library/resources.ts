export type LibraryResource = {
  id: string;
  title: string;
  subject: string;
  downloadUrl?: string;
};

// Preview resources are shared until the school library is connected.
export const previewResources: LibraryResource[] = [
  {
    id: "math-study-guide",
    title: "Daily Study Guide",
    subject: "Mathematics",
  },
  {
    id: "english-reading-guide",
    title: "Reading Comprehension Practice",
    subject: "English",
  },
  {
    id: "science-review",
    title: "End-of-Term Review",
    subject: "Science",
  },
];
