"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthError, AuthField, AuthSubmit } from "@/components/auth/AuthField";
import { homePathFromAccessToken } from "@/lib/auth/home-path";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ schoolName }: { schoolName: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setPending(false);
      return;
    }

    router.push(homePathFromAccessToken(data.session?.access_token));
    router.refresh();
  }

  return (
    <form className="space-y-4" method="post" onSubmit={onSubmit}>
      <h1 className="text-center text-lg font-medium leading-7 text-slate-500">
        Welcome to
        <span className="mt-1 block break-words text-2xl font-semibold tracking-tight text-slate-900">
          {schoolName ?? "TerraLearn"}
        </span>
      </h1>
      {error ? <AuthError>{error}</AuthError> : null}
      <AuthField
        id="email"
        label="Email"
        type="email"
        autoComplete="username"
        value={email}
        onChange={setEmail}
        className="auth-field"
      />
      <AuthField
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        className="auth-field"
      />
      <AuthSubmit pending={pending} label="Sign in" pendingLabel="Signing in..." />
      <p className="text-sm text-slate-500">
        <Link
          href="/reset"
          className="underline underline-offset-2 transition-colors hover:text-brand-primary"
        >
          Forgot password
        </Link>
      </p>
    </form>
  );
}
