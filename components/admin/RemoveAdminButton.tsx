"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeSchoolAdmin } from "@/app/(admin)/admin/people/actions";
import { Modal } from "@/app/(admin)/admin/academic/_components/Modal";
import { alertError, buttonPrimary, buttonSecondary } from "@/lib/ui/styles";

export function RemoveAdminButton({ profileId, name }: { profileId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onRemove() {
    setError(null);
    setPending(true);
    const result = await removeSchoolAdmin(profileId);
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
          setOpen(true);
        }}
      >
        Remove
      </button>
      {open ? (
        <Modal
          title={`Remove ${name}`}
          onClose={() => {
            if (!pending) setOpen(false);
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-ink-secondary">
              {name} will no longer be a school admin.
            </p>
            {error ? (
              <p role="alert" className={alertError}>
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className={buttonSecondary}
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={buttonPrimary}
                disabled={pending}
                onClick={() => void onRemove()}
              >
                {pending ? "Removing..." : "Remove admin"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
