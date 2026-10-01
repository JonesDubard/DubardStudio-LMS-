"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthError, AuthField, AuthSubmit } from "@/components/auth/AuthField";

export function InviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { data: existing } = await supabase.auth.getSession();

    if (!existing.session) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "invite",
      });
      if (verifyError) {
        setError(verifyError.message);
        setPending(false);
        return;
      }
    }

    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      setError(passwordError.message);
      setPending(false);
      return;
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-bold">Accept invitation</h1>
      <p className="text-sm text-[#666666]">Set a password for this account.</p>
      {error ? <AuthError>{error}</AuthError> : null}
      <AuthField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      <AuthField
        id="confirm-password"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
      />
      <AuthSubmit pending={pending} label="Set password" pendingLabel="Saving..." />
    </form>
  );
}
