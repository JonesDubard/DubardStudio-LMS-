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
      <p className="mx-auto w-full max-w-3xl px-4 pt-4 text-xs text-ink-muted md:px-8">
        Lessons saved for offline viewing are stored on this device only.
      </p>
      <OfflineLibrary />
    </>
  );
}
