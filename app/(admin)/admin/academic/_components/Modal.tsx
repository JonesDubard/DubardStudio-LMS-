"use client";

import { useEffect, type ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#333333]/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="academic-dialog-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-[#999999] bg-white p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="academic-dialog-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="border border-[#999999] px-2 py-1 text-sm"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
