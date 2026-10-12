export const inputClass = "w-full border border-[#999999] px-3 py-2 text-sm";
export const labelClass = "mb-1 block text-sm font-medium";
export const primaryButtonClass =
  "border border-[#333333] bg-[#333333] px-5 py-3 text-sm text-white disabled:opacity-60";
export const secondaryButtonClass =
  "border border-[#333333] bg-white px-3 py-2 text-sm disabled:opacity-60";
export const quietButtonClass =
  "border border-[#999999] bg-white px-2 py-1 text-sm disabled:opacity-60";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-sm">
      {message}
    </p>
  );
}

export function ServerError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="border border-[#333333] bg-[#E5E5E5] px-3 py-2 text-sm"
    >
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
