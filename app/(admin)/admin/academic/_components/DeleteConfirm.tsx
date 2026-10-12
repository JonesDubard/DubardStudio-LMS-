"use client";

import {
  ServerError,
  primaryButtonClass,
  secondaryButtonClass,
} from "./FormControls";

export function DeleteConfirm({
  name,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-4">
      <p>Are you sure? This removes {name} records</p>
      <ServerError message={error} />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className={secondaryButtonClass}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={primaryButtonClass}
        >
          {pending ? "Removing..." : "Remove"}
        </button>
      </div>
    </div>
  );
}
