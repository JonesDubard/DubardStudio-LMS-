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
  const [visible, setVisible] = useState(false);
  const inputType = type === "password" && visible ? "text" : type;

  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={inputType}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={type === "password" ? `${fieldControl} pr-16` : fieldControl}
        />
        {type === "password" ? (
          <button
            type="button"
            className="absolute inset-y-1 right-1 rounded-md px-2 text-xs font-semibold text-ink-secondary transition-colors duration-200 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
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
