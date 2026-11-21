"use client";

import Link from "next/link";
import { useEffect, useState, type SubmitEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthError, AuthField, AuthSubmit } from "@/components/auth/AuthField";
import {
  RESET_COOLDOWN_SECONDS,
  formatCountdown,
  resetWaitSeconds,
} from "@/lib/auth/reset-cooldown";
import { buttonSecondary } from "@/lib/ui/styles";

export function ResetRequestForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  // Seconds until another reset email may be sent (US-004.3). 0 = allowed now.
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendLink() {
    setError(null);
    setPending(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/reset/confirm`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setPending(false);

    const wait = resetWaitSeconds(resetError);
    if (wait !== null) {
      // Too soon: not a failure, just wait. The countdown says how long.
      setCooldown(wait);
      return;
    }
    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
    setCooldown(RESET_COOLDOWN_SECONDS);
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendLink();
  }

  const waiting = cooldown > 0;

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

      {waiting ? (
        <p className="text-sm text-ink-secondary" role="status" aria-live="polite">
          You can ask for another link in{" "}
          <span className="font-medium tabular-nums text-ink">{formatCountdown(cooldown)}</span>.
        </p>
      ) : null}

      {sent ? (
        <button
          type="button"
          className={`${buttonSecondary} min-h-12 w-full`}
          disabled={pending || waiting}
          onClick={() => void sendLink()}
        >
          {pending ? "Sending..." : "Didn't get it? Send again"}
        </button>
      ) : (
        <AuthSubmit
          pending={pending || waiting}
          label="Send reset link"
          pendingLabel={waiting ? "Please wait..." : "Sending..."}
        />
      )}
      <p className="text-sm">
        <Link href="/login" className="underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
