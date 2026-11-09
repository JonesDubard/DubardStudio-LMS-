import { PrimaryButton } from "@/components/shared/PrimaryButton";

export default function AssignmentNotFound() {
  return (
    <main className="space-y-4 px-4 py-5">
      <h1 className="text-lg font-bold">Assignment not found</h1>
      <p className="text-sm text-ink-secondary">
        This assignment is not available.
      </p>
      <PrimaryButton href="/feed">Back to Learning Feed</PrimaryButton>
    </main>
  );
}
