import type { ReactNode } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  helperText?: string;
  children: ReactNode;
};

export function FormField({ id, label, helperText, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-medium">
        {label}
      </label>
      {children}
      {helperText ? (
        <p className="mt-1 text-sm text-[#666666]">{helperText}</p>
      ) : null}
    </div>
  );
}
