"use client";

import { useState } from "react";
import { openLessonMaterial } from "@/lib/queries/assessments";
import { alertError, buttonPrimaryCompact } from "@/lib/ui/styles";

export function LessonDownloadButton({ materialId }: { materialId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function download() {
    setError(null);
    setPending(true);
    const result = await openLessonMaterial(materialId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        className={`${buttonPrimaryCompact} min-h-11 px-3 text-xs`}
        disabled={pending}
        onClick={() => void download()}
      >
        {pending ? "Opening..." : "Download"}
      </button>
      {error ? <p className={alertError}>{error}</p> : null}
    </div>
  );
}
