"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthError, AuthField, AuthSubmit } from "@/components/auth/AuthField";

export function ResetRequestForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/reset/confirm`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (resetError) {
      setError(resetError.message);
      setPending(false);
      return;
    }

    setSent(true);
    setPending(false);
  }

  return (
    <form className="space-y-4" method="post" onSubmit={onSubmit}>
      <h1 className="text-xl font-bold">Reset password</h1>
      {error ? <AuthError>{error}</AuthError> : null}
      {sent ? (
        <p className="text-sm">Check your email for a reset link.</p>
      ) : (
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={setEmail}
        />
      )}
      {sent ? null : (
        <AuthSubmit pending={pending} label="Send reset link" pendingLabel="Sending..." />
      )}
      <p className="text-sm">
        <Link href="/login" className="underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
