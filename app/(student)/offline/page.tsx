import type { Metadata } from "next";
import { OfflineLibrary } from "@/components/student/OfflineLibrary";
import { PageHeader } from "@/components/shared/PageHeader";

export const metadata: Metadata = {
  title: "Offline Library",
};

export default function OfflinePage() {
  return (
    <>
      <PageHeader
        variant="section"
        eyebrow="Student"
        title="Offline Library"
        backHref="/feed"
        backLabel="Back to Home"
      />
      <OfflineLibrary />
    </>
  );
}
