import type { ReactNode } from "react";
import { fieldHelper, fieldLabel } from "@/lib/ui/styles";

type FormFieldProps = {
  id: string;
  label: string;
  helperText?: string;
  children: ReactNode;
};

export function FormField({ id, label, helperText, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      {children}
      {helperText ? <p className={fieldHelper}>{helperText}</p> : null}
    </div>
  );
}
