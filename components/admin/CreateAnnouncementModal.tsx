"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { FormField } from "@/components/shared/FormField";
import { Input } from "@/components/shared/Input";
import { Textarea } from "@/components/shared/Textarea";
import { buttonPrimary, buttonSecondary } from "@/lib/ui/styles";

export function CreateAnnouncementModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`${buttonPrimary} shrink-0`}
        onClick={() => setOpen(true)}
      >
        Create announcement
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-announcement-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-line bg-surface p-6 text-ink shadow-lift"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Notice Board
                </p>
                <h2
                  id="create-announcement-title"
                  className="mt-1 text-lg font-semibold tracking-tight"
                >
                  Create Announcement
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`${buttonSecondary} min-h-10 px-2.5`}
                aria-label="Close announcement dialog"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => event.preventDefault()}
            >
              <FormField id="announcement-title" label="Title">
                <Input
                  id="announcement-title"
                  name="title"
                  placeholder="e.g. General Assembly"
                  autoFocus
                />
              </FormField>
              <FormField id="announcement-message" label="Message">
                <Textarea
                  id="announcement-message"
                  name="message"
                  placeholder="Write your announcement..."
                  rows={5}
                />
              </FormField>

              <p role="status" className="text-sm leading-5 text-ink-secondary">
                Publishing is unavailable in this preview because announcement
                storage and its server action are not yet implemented.
              </p>
              <div className="flex justify-end">
                <button type="submit" disabled className={buttonPrimary}>
                  Publish announcement
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
