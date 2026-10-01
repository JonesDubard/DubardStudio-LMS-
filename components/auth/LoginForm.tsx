"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthError, AuthField, AuthSubmit } from "@/components/auth/AuthField";

export function LoginForm() {
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
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setPending(false);
      return;
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <form className="space-y-4" method="post" onSubmit={onSubmit}>
      <h1 className="text-xl font-bold">Sign in</h1>
      {error ? <AuthError>{error}</AuthError> : null}
      <AuthField
        id="email"
        label="Email"
        type="email"
        autoComplete="username"
        value={email}
        onChange={setEmail}
      />
      <AuthField
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
      <AuthSubmit pending={pending} label="Sign in" pendingLabel="Signing in..." />
      <p className="text-sm">
        <Link href="/reset" className="underline">
          Forgot password
        </Link>
      </p>
    </form>
  );
}
