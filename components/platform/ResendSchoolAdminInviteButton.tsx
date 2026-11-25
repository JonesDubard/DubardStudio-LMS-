"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resendSchoolAdminInviteById } from "@/app/(platform)/platform/actions";
import { buttonSecondary } from "@/lib/ui/styles";

export function ResendSchoolAdminInviteButton({
  tenantId,
  invitationId,
}: {
  tenantId: string;
  invitationId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onClick() {
    setPending(true);
    setMessage(null);
    const result = await resendSchoolAdminInviteById(tenantId, invitationId);
    setPending(false);
    setMessage(
      result.ok
        ? { ok: true, text: result.notice ?? "Invite sent again." }
        : { ok: false, text: result.error },
    );
    if (result.ok) router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={pending}
        className={buttonSecondary}
      >
        {pending ? "Sending..." : "Resend"}
      </button>
      {message ? (
        <span role="status" className={`text-xs ${message.ok ? "text-green-700" : "text-red-700"}`}>
          {message.text}
        </span>
      ) : null}
    </span>
  );
}
