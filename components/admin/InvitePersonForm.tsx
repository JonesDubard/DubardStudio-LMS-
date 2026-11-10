"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { invitePerson, type InviteRole } from "@/app/(admin)/admin/people/teachers/actions";
import { alertError, buttonPrimary, fieldControl, fieldLabel } from "@/lib/ui/styles";

const labels: Record<InviteRole, string> = {
  teacher: "Teacher",
  student: "Student",
  school_admin: "School admin",
  parent: "Parent",
};

export function InvitePersonForm({ role }: { role: InviteRole }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const label = labels[role];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    const result = await invitePerson(email, role);
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
        <label className={fieldLabel} htmlFor={`invite-${role}`}>
          {label} email
        </label>
        <input
          id={`invite-${role}`}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldControl}
          autoComplete="off"
          required
        />
      </div>
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Saving..." : `Invite ${label}`}
      </button>
      {error ? (
        <p role="alert" className={`${alertError} basis-full`}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="basis-full text-sm text-ink-secondary">
          {notice}
        </p>
      ) : null}
    </form>
  );
}
