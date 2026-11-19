"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type SubmitEvent } from "react";
import { AuthError, AuthField, AuthSubmit } from "@/components/auth/AuthField";
import { homePathFromAccessToken } from "@/lib/auth/home-path";
import { createClient } from "@/lib/supabase/client";

export function ResetConfirmForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type = params.get("type");

    async function establishSession() {
      const invalid = "This reset link is invalid or has expired. Ask for a new one.";


      if (tokenHash && type === "recovery") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (verifyError) {
          setError(invalid);
          return;
        }
        setReady(true);
        return;
      }

      if (code) {
        const { error: linkError } = await supabase.auth.initialize();
        if (linkError) {
          setError(invalid);
          return;
        }
        if (new URLSearchParams(window.location.search).has("code")) {
          setError(
            "Open this link in the same browser where you asked for it, or ask for a new one.",
          );
          return;
        }
        setReady(true);
        return;
      }

      setError("This reset link is invalid or has expired.");
    }

    void establishSession();
  }, []);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      setError(passwordError.message);
      setPending(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    router.push(homePathFromAccessToken(sessionData.session?.access_token));
    router.refresh();
  }

  return (
    <form className="space-y-4" method="post" onSubmit={onSubmit}>
      <h1 className="text-xl font-bold">Set a new password</h1>
      {error ? <AuthError>{error}</AuthError> : null}
      {ready ? (
        <>
          <AuthField
            id="password"
            label="New password"
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
          <AuthSubmit pending={pending} label="Update password" pendingLabel="Saving..." />
        </>
      ) : null}
    </form>
  );
}
