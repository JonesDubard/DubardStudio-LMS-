import { alertError, buttonGhost, buttonPrimary, buttonSecondary, fieldControl, fieldError, fieldLabel } from "@/lib/ui/styles";

export const inputClass = fieldControl;
export const labelClass = fieldLabel;
export const primaryButtonClass = buttonPrimary;
export const secondaryButtonClass = buttonSecondary;
export const quietButtonClass = buttonGhost;

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={fieldError}>
      {message}
    </p>
  );
}

export function ServerError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className={alertError}>
      {message}
    </p>
  );
}

export function FormActions({
  pending,
  label,
}: {
  pending: boolean;
  label: string;
}) {
  return (
    <div className="flex justify-end">
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Saving..." : label}
      </button>
    </div>
  );
}
