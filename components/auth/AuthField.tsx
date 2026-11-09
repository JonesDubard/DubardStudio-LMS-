"use client";

import { useEffect, useState, type ReactNode } from "react";
import { alertError, buttonPrimary, fieldControl, fieldLabel } from "@/lib/ui/styles";

export function AuthField({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: "email" | "password";
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldControl}
      />
    </div>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className={alertError}>
      {children}
    </p>
  );
}

export function AuthSubmit({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <button
      type="submit"
      disabled={pending || !ready}
      className={`${buttonPrimary} min-h-12 w-full`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
