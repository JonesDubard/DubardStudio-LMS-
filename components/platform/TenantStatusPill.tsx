import type { SubscriptionStatus } from "@/lib/stubs/get-tenants";

type TenantStatusPillProps = {
  status: SubscriptionStatus;
};

const statusClassName: Record<SubscriptionStatus, string> = {
  Trial: "rounded-full border border-[#999999] px-2 py-1 text-xs",
  Active: "rounded-full bg-[#333333] px-2 py-1 text-xs text-white",
  Suspended:
    "rounded-full border border-[#666666] px-2 py-1 text-xs text-[#333333]",
  Cancelled: "bg-[#E5E5E5] px-2 py-1 text-xs line-through text-[#666666]",
};

export function TenantStatusPill({ status }: TenantStatusPillProps) {
  if (status === "Suspended") {
    return (
      <span
        className={statusClassName.Suspended}
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #E5E5E5 0, #E5E5E5 3px, #ffffff 3px, #ffffff 6px)",
        }}
      >
        {status}
      </span>
    );
  }

  return <span className={statusClassName[status]}>{status}</span>;
}
