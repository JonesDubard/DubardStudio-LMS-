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
    <div className="motion-fade fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="academic-dialog-title"
        className="motion-rise max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-line bg-surface p-6 shadow-lift"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="academic-dialog-title" className="text-lg font-semibold tracking-tight text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-secondary transition-colors duration-200 hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
