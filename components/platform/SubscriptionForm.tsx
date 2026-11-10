"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTenantSubscription } from "@/app/(platform)/platform/actions";
import { SubscriptionRadioGroup } from "@/components/platform/SubscriptionRadioGroup";
import type { SubscriptionStatus } from "@/lib/platform/schools";
import { alertError, buttonPrimary, buttonSecondary } from "@/lib/ui/styles";

const options: { value: SubscriptionStatus; label: string; description: string }[] = [
  { value: "Trial", label: "Trial", description: "Tenant has trial access." },
  { value: "Active", label: "Active", description: "Tenant has active access." },
  { value: "Suspended", label: "Suspended", description: "Tenant access is suspended." },
  { value: "Cancelled", label: "Cancelled", description: "Tenant access is cancelled." },
];

export function SubscriptionForm({
  tenantId,
  tenantName,
  current,
}: {
  tenantId: string;
  tenantName: string;
  current: SubscriptionStatus;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<SubscriptionStatus>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    setError(null);
    setPending(true);
    const result = await updateTenantSubscription(tenantId, selected);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <SubscriptionRadioGroup
        options={options}
        defaultValue={current}
        value={selected}
        onChange={setSelected}
      />
      <div className="mt-6 border border-line-strong p-5">
        <div className="text-sm font-semibold">Confirm subscription change</div>
        <p className="mt-2 text-sm text-ink-secondary">
          You are changing {tenantName} from <strong>{current}</strong> to{" "}
          <strong>{selected}</strong>. This will affect tenant access and create an audit event.
        </p>
        {error ? (
          <p role="alert" className={`${alertError} mt-3`}>
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            className={buttonSecondary}
            disabled={pending}
            onClick={() => {
              setSelected(current);
              setError(null);
            }}
          >
            Cancel Change
          </button>
          <button
            type="button"
            className={buttonPrimary}
            disabled={pending || selected === current}
            onClick={() => void onConfirm()}
          >
            {pending ? "Saving..." : "Change Status"}
          </button>
        </div>
      </div>
    </div>
  );
}
