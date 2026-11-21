"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { acceptInvite } from "@/app/(auth)/invite/actions";
import { AuthError, AuthField, AuthSubmit } from "@/components/auth/AuthField";
import { homePathFromAccessToken } from "@/lib/auth/home-path";
import { createClient } from "@/lib/supabase/client";
import { fieldControl, fieldLabel } from "@/lib/ui/styles";

export function InviteForm({
  token,
  schoolName,
  roleLabel,
  email,
  signedInEmail,
}: {
  token: string;
  schoolName: string;
  roleLabel: string;
  email: string;
  signedInEmail: string | null;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const signedIn = signedInEmail !== null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!signedIn) {
      if (fullName.trim().length === 0) {
        setError("Enter your full name.");
        return;
      }
      if (password.length < 8) {
        setError("Choose a password of at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setPending(true);
    const result = await acceptInvite(token, { fullName, password });
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    const supabase = createClient();
    if (result.signedIn) {
      await supabase.auth.refreshSession();
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password,
      });
      if (signInError) {
        setPending(false);
        router.push("/login");
        return;
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();
    router.push(homePathFromAccessToken(sessionData.session?.access_token));
    router.refresh();
  }

  return (
    <form className="space-y-4" method="post" onSubmit={onSubmit} noValidate>
      <h1 className="text-xl font-bold">Accept invitation</h1>
      <p className="text-sm text-ink-secondary">
        You&apos;ve been invited to{" "}
        <strong className="text-ink">{schoolName}</strong> as{" "}
        <strong className="text-ink">{roleLabel}</strong>.
      </p>
      {error ? <AuthError>{error}</AuthError> : null}

      {signedIn ? (
        <p className="text-sm text-ink-secondary">
          You&apos;re signed in as{" "}
          <strong className="text-ink">{signedInEmail}</strong>. Accept to add
          this role to your account.
        </p>
      ) : (
        <>
          <div>
            <span className={fieldLabel}>Email</span>
            <p className="text-sm text-ink">{email}</p>
          </div>
          <div>
            <label htmlFor="full-name" className={fieldLabel}>
              Full name
            </label>
            <input
              id="full-name"
              name="full-name"
              type="text"
              autoComplete="name"
              maxLength={200}
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={fieldControl}
            />
          </div>
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
        </>
      )}

      <AuthSubmit
        pending={pending}
        label={signedIn ? "Accept invitation" : "Create account"}
        pendingLabel="Saving..."
      />
    </form>
  );
}
