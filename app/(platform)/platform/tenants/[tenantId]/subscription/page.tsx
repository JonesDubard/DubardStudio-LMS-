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
      <div className="mx-auto max-w-[1440px] p-4 md:p-8">
        <ElevatedAccessBanner tenantName={data.tenantName} />

        <header className="mb-6">
          <div className="text-sm text-ink-secondary">
            Tenants / {data.tenantName}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{data.tenantName}</h1>
            <TenantStatusPill status={data.status} />
          </div>
          <p className="mt-2 text-sm text-ink-secondary">{data.subdomainHost}</p>
        </header>

        <TabBar tabs={data.tabs} />

        <section className="border border-line-subtle">
          <div className="border-b border-line-subtle px-6 py-5">
            <h2 className="font-semibold">Subscription Status</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Current status:{" "}
              <span className="font-medium text-ink">{data.status}</span>
            </p>
          </div>

          <div className="p-6">
            <SubscriptionRadioGroup
              options={data.options}
              defaultValue={data.status}
            />
          </div>

          <div className="mx-6 mb-6 border border-line bg-surface-muted p-4">
            <div className="text-sm font-medium">{data.gateNoticeTitle}</div>
            <div className="mt-1 text-sm text-ink-secondary">
              {data.gateNoticeBody}
            </div>
          </div>

          <div className="mx-6 mb-6">
            <div className="border border-line-strong p-5">
              <div className="text-sm font-semibold">{data.confirmTitle}</div>
              <p className="mt-2 text-sm text-ink-secondary">
                You are changing {data.tenantName} from{" "}
                <strong>Trial</strong> to <strong>Suspended</strong>. This will
                affect tenant access and create an audit event.
              </p>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="border border-line px-4 py-2.5 text-sm"
                >
                  {data.confirmCancelLabel}
                </button>
                <button
                  type="button"
                  className="bg-brand-primary px-4 py-2.5 text-sm font-medium text-white"
                >
                  {data.confirmActionLabel}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-x-auto border border-line-subtle">
          <div className="border-b border-line-subtle px-6 py-5">
            <h2 className="font-semibold">{data.historyTitle}</h2>
          </div>

          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead className="border-b border-line bg-surface text-left text-sm font-medium text-ink-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Admin</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((row) => (
                <tr key={row.id} className="border-t border-line-subtle">
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
