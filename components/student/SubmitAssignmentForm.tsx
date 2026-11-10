"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitAssignment } from "@/lib/queries/assessments";
import { alertError, buttonPrimary, fieldControl, fieldLabel, surfaceCard } from "@/lib/ui/styles";

export function SubmitAssignmentForm({
  assessmentId,
  mode = "hand-in",
}: {
  assessmentId: string;
  mode?: "hand-in" | "attach";
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const result = await submitAssignment(assessmentId, mode === "attach" ? "" : text, file);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form className={`space-y-4 p-5 ${surfaceCard}`} onSubmit={onSubmit}>
      {error ? (
        <p className={alertError}>{error}</p>
      ) : null}
      {mode === "hand-in" ? (
        <>
          <label className={fieldLabel} htmlFor="answer">
            Your answer
          </label>
          <textarea
            id="answer"
            rows={6}
            value={text}
            onChange={(event) => setText(event.target.value)}
            className={fieldControl}
          />
        </>
      ) : (
        <p className="text-sm text-ink-secondary">
          Add a file to the work you already handed in.
        </p>
      )}
      <div>
        <label className={fieldLabel} htmlFor="submission-file">
          {mode === "attach" ? "File" : "File (optional)"}
        </label>
        <input
          id="submission-file"
          type="file"
          accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
          className="mt-1 block w-full text-sm text-ink-secondary file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <p className="mt-1 text-sm text-ink-secondary">
          PDF, Word, JPEG, PNG, or WebP. 10 MB maximum.
        </p>
      </div>
      <button
        type="submit"
        disabled={pending}
        className={`${buttonPrimary} min-h-12 w-full`}
      >
        {pending ? "Handing in..." : mode === "attach" ? "Attach file" : "Hand in"}
      </button>
    </form>
  );
}
