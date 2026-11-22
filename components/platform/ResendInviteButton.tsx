"use client";

import { useState } from "react";
import { resendFirstAdminInvite } from "@/app/(platform)/platform/actions";
import { buttonSecondary } from "@/lib/ui/styles";

/** US-008b.4: resend the first School Admin invite (same invitation, new link). */
export function ResendInviteButton({
  tenantId,
  className,
}: {
  tenantId: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onClick() {
    setPending(true);
    setMessage(null);
    const result = await resendFirstAdminInvite(tenantId);
    setPending(false);
    setMessage(
      result.ok
        ? { ok: true, text: "Invite sent." }
        : { ok: false, text: result.error },
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={pending}
        className={className ?? buttonSecondary}
      >
        {pending ? "Sending..." : "Resend invite"}
      </button>
      {message ? (
        <span role="status" className={`text-xs ${message.ok ? "text-green-700" : "text-red-700"}`}>
          {message.text}
        </span>
      ) : null}
    </span>
  );
}