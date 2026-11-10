import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PrimaryButton } from "@/components/shared/PrimaryButton";

export default function AssignmentNotFound() {
  return (
    <main className="px-4 py-8 md:px-8">
      <EmptyState
        icon={ClipboardList}
        title="Assignment not found"
        description="This assignment is not available."
        action={<PrimaryButton href="/feed">Back to Learning Feed</PrimaryButton>}
      />
    </main>
  );
}
