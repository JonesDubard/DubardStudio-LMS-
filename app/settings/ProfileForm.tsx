"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/shared/FormField";
import { alertError, buttonPrimary, fieldControl, surfaceCard } from "@/lib/ui/styles";
import { updateProfile } from "./actions";

export function ProfileForm({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [address, setAddress] = useState(email);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    const result = await updateProfile({ fullName: name, email: address });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(result.notice);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className={`${surfaceCard} space-y-5 p-5`}>
      <FormField id="full-name" label="Display name">
        <input
          id="full-name"
          name="fullName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldControl}
          autoComplete="name"
          required
        />
      </FormField>
      <FormField
        id="email"
        label="Login email"
        helperText="This is the address you use to sign in."
      >
        <input
          id="email"
          name="email"
          type="email"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className={fieldControl}
          autoComplete="email"
          required
        />
      </FormField>
      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-ink-secondary">
          {notice}
        </p>
      ) : null}
      <button type="submit" disabled={pending || !ready} className={buttonPrimary}>
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
