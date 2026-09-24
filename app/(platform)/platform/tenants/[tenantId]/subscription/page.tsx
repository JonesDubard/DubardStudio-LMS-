import type { Metadata } from "next";
import { SubscriptionRadioGroup } from "@/components/platform/SubscriptionRadioGroup";
import { TenantStatusPill } from "@/components/platform/TenantStatusPill";
import { ElevatedAccessBanner } from "@/components/shared/ElevatedAccessBanner";
import { TabBar } from "@/components/shared/TabBar";
import { getTenantSubscription } from "@/lib/stubs/get-tenant-subscription";

export const metadata: Metadata = {
  title: "Platform Admin — Tenant Subscription",
};

type TenantSubscriptionPageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function TenantSubscriptionPage({
  params,
}: TenantSubscriptionPageProps) {
  const { tenantId } = await params;
  const data = getTenantSubscription(tenantId);

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1440px] p-8">
        <ElevatedAccessBanner tenantName={data.tenantName} />

        <header className="mb-6">
          <div className="text-sm text-[#666666]">
            Tenants / {data.tenantName}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{data.tenantName}</h1>
            <TenantStatusPill status={data.status} />
          </div>
          <p className="mt-2 text-sm text-[#666666]">{data.subdomainHost}</p>
        </header>

        <TabBar tabs={data.tabs} />

        <section className="border border-[#E5E5E5]">
          <div className="border-b border-[#E5E5E5] px-6 py-5">
            <h2 className="font-semibold">Subscription Status</h2>
            <p className="mt-1 text-sm text-[#666666]">
              Current status:{" "}
              <span className="font-medium text-[#333333]">{data.status}</span>
            </p>
          </div>

          <div className="p-6">
            <SubscriptionRadioGroup
              options={data.options}
              defaultValue={data.status}
            />
          </div>

          <div className="mx-6 mb-6 border border-[#999999] bg-[#E5E5E5] p-4">
            <div className="text-sm font-medium">{data.gateNoticeTitle}</div>
            <div className="mt-1 text-sm text-[#666666]">
              {data.gateNoticeBody}
            </div>
          </div>

          <div className="mx-6 mb-6">
            <div className="border border-[#666666] p-5">
              <div className="text-sm font-semibold">{data.confirmTitle}</div>
              <p className="mt-2 text-sm text-[#666666]">
                You are changing {data.tenantName} from{" "}
                <strong>Trial</strong> to <strong>Suspended</strong>. This will
                affect tenant access and create an audit event.
              </p>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="border border-[#999999] px-4 py-2.5 text-sm"
                >
                  {data.confirmCancelLabel}
                </button>
                <button
                  type="button"
                  className="bg-[#333333] px-4 py-2.5 text-sm font-medium text-white"
                >
                  {data.confirmActionLabel}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-x-auto border border-[#E5E5E5]">
          <div className="border-b border-[#E5E5E5] px-6 py-5">
            <h2 className="font-semibold">{data.historyTitle}</h2>
          </div>

          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead className="bg-[#E5E5E5] text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Admin</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((row) => (
                <tr key={row.id} className="border-t border-[#E5E5E5]">
                  <td className="px-4 py-4">{row.date}</td>
                  <td className="px-4 py-4">{row.from}</td>
                  <td className="px-4 py-4">{row.to}</td>
                  <td className="px-4 py-4">{row.admin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
