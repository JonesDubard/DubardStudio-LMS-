"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitAssignment } from "@/lib/queries/assessments";

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
    <form className="space-y-4 border border-[#999999] p-4" onSubmit={onSubmit}>
      {error ? (
        <p className="border border-[#333333] bg-[#E5E5E5] px-3 py-2 text-sm">{error}</p>
      ) : null}
      <label className="mb-2 block text-xs font-bold" htmlFor="answer">
        Your answer
      </label>
      <textarea
        id="answer"
        rows={6}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="w-full border border-[#999999] p-3 text-sm"
        required
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full border border-brand-primary bg-brand-primary px-4 py-3 text-sm font-bold text-white"
      >
        {pending ? "Handing in..." : "Hand in"}
      </button>
    </form>
  );
}
