"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { alertError, buttonPrimary, fieldControl, fieldLabel } from "@/lib/ui/styles";
import { inviteTeacher } from "./actions";

export function InviteTeacherForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    const result = await inviteTeacher(email);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEmail("");
    setNotice("Invitation saved. No email was sent.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <label className={fieldLabel} htmlFor="invite-email">
          Teacher email
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldControl}
          autoComplete="off"
          required
        />
      </div>
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Saving..." : "Invite teacher"}
      </button>
      {error ? (
        <p role="alert" className={`${alertError} sm:basis-full`}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-ink-secondary sm:basis-full">
          {notice}
        </p>
      ) : null}
    </form>
  );
}
