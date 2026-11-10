import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PrimaryButton } from "@/components/shared/PrimaryButton";

export default function LessonNotFound() {
  return (
    <main className="px-4 py-8 md:px-8">
      <EmptyState
        icon={BookOpen}
        title="Lesson not found"
        description="This lesson is not available. It may be unpublished, or it belongs to another school."
        action={<PrimaryButton href="/feed">Back to Learning Feed</PrimaryButton>}
      />
    </main>
  );
}
