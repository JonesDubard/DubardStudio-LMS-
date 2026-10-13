"use client";

import { useEffect, useState, type ReactNode } from "react";

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
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
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
        className="w-full border border-[#999999] px-3 py-3"
      />
    </div>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="border border-[#333333] bg-[#E5E5E5] px-3 py-2 text-sm">
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
      className="min-h-12 w-full border border-brand-primary bg-brand-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
