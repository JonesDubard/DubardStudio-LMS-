import { PrimaryButton } from "@/components/shared/PrimaryButton";

export default function LessonNotFound() {
  return (
    <main className="space-y-4 px-4 py-5">
      <h1 className="text-lg font-bold">Lesson not found</h1>
      <p className="text-sm text-[#666666]">
        This lesson is not available. It may be unpublished, or it belongs to another school.
      </p>
      <PrimaryButton href="/feed">Back to Learning Feed</PrimaryButton>
    </main>
  );
}
