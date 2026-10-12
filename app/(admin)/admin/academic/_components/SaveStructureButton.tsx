"use client";

import { useState } from "react";

export function SaveStructureButton() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      {message ? (
        <p role="status" className="text-sm text-[#666666]">
          {message}
        </p>
      ) : null}
      <button
        type="button"
        className="border border-[#333333] bg-[#333333] px-5 py-3 text-white"
        onClick={() =>
          setMessage(
            "Each year, term, class, and subject is saved when you add or edit it.",
          )
        }
      >
        Save Academic Structure
      </button>
    </div>
  );
}
