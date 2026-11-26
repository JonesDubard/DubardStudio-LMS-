import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  ResourceGrid,
  type LibraryResource,
} from "@/components/student/ResourceGrid";

export const metadata: Metadata = {
  title: "Digital Library",
};

const previewResources: LibraryResource[] = [
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

export default function StudentLibraryPage() {
  return (
    <>
      <PageHeader variant="section" eyebrow="Student" title="Digital Library" />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-8">
        <section className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-ink">
            Daily Study Guides
          </h2>
          <p className="text-sm text-ink-secondary">
            Sample resources are shown until the school library is connected.
          </p>
        </section>
        <ResourceGrid resources={previewResources} />
      </main>
    </>
  );
}
