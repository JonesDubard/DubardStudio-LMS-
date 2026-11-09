"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitAssignment } from "@/lib/queries/assessments";
import { alertError, buttonPrimary, fieldControl, fieldLabel, surfaceCard } from "@/lib/ui/styles";

export function SubmitAssignmentForm({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const result = await submitAssignment(assessmentId, text);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form className={`space-y-4 p-4 ${surfaceCard}`} onSubmit={onSubmit}>
      {error ? (
        <p className={alertError}>{error}</p>
      ) : null}
      <label className={fieldLabel} htmlFor="answer">
        Your answer
      </label>
      <textarea
        id="answer"
        rows={6}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={fieldControl}
        required
      />
      <button
        type="submit"
        disabled={pending}
        className={`${buttonPrimary} min-h-12 w-full`}
      >
        {pending ? "Handing in..." : "Hand in"}
      </button>
    </form>
  );
}
