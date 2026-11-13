"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/app/(admin)/admin/academic/_components/Modal";
import {
  alertError,
  buttonPrimary,
  buttonSecondary,
  fieldControl,
  fieldLabel,
} from "@/lib/ui/styles";

type AssignResult = { ok: true } | { ok: false; error: string };

export function AssignPersonButton({
  personId,
  personName,
  options,
  fieldName,
  blockedMessage,
  assign,
}: {
  personId: string;
  personName: string;
  options: { id: string; label: string }[];
  fieldName: string;
  blockedMessage: string | null;
  assign: (personId: string, optionId: string) => Promise<AssignResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [optionId, setOptionId] = useState(options[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function close() {
    if (pending) return;
    setOpen(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!optionId) return;
    setError(null);
    setPending(true);
    const result = await assign(personId, optionId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className={buttonSecondary}
        onClick={() => {
          setError(null);
          setOptionId(options[0]?.id ?? "");
          setOpen(true);
        }}
      >
        Assign class
      </button>
      {open ? (
        <Modal title={`Assign ${personName}`} onClose={close}>
          {blockedMessage ? (
            <p className="text-sm text-ink-secondary">{blockedMessage}</p>
          ) : (
            <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
              {error ? (
                <p role="alert" className={alertError}>
                  {error}
                </p>
              ) : null}
              <div>
                <label className={fieldLabel} htmlFor={`assign-${personId}`}>
                  {fieldName}
                </label>
                <select
                  id={`assign-${personId}`}
                  className={fieldControl}
                  value={optionId}
                  onChange={(event) => setOptionId(event.target.value)}
                >
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={buttonPrimary} disabled={pending || !optionId}>
                {pending ? "Saving..." : "Save"}
              </button>
            </form>
          )}
        </Modal>
      ) : null}
    </>
  );
}
