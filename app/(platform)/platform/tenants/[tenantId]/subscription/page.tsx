import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubscriptionForm } from "@/components/platform/SubscriptionForm";
import { TenantStatusPill } from "@/components/platform/TenantStatusPill";
import { ElevatedAccessBanner } from "@/components/shared/ElevatedAccessBanner";
import { TabBar } from "@/components/shared/TabBar";
import {
  assertPlatformAdmin,
  getSchool,
  subscriptionHistory,
  subscriptionLabel,
} from "@/lib/platform/schools";
import { surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Platform Admin — Tenant Subscription",
};

type TenantSubscriptionPageProps = {
  params: Promise<{ tenantId: string }>;
};

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function TenantSubscriptionPage({
  params,
}: TenantSubscriptionPageProps) {
  const { tenantId } = await params;
  await assertPlatformAdmin();
  const school = await getSchool(tenantId);
  if (!school) notFound();
  const status = subscriptionLabel(school.subscription_status);
  const history = await subscriptionHistory(school.id);
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "localhost";

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1440px] p-4 lg:p-8">
        <ElevatedAccessBanner tenantName={school.name} />

        <header className="mb-6">
          <p className="text-xs font-medium text-ink-muted">Tenants / {school.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="break-words text-xl font-semibold tracking-tight md:text-2xl">
              {school.name}
            </h1>
            <TenantStatusPill status={status} />
          </div>
          <p className="mt-2 text-sm text-ink-secondary">
            {school.subdomain}.{root}
          </p>
        </header>

        <TabBar
          tabs={[
            { label: "Profile", href: `/platform/tenants/${school.id}`, active: false },
            {
              label: "Subscription",
              href: `/platform/tenants/${school.id}/subscription`,
              active: true,
            },
            { label: "Onboarding", href: "#", active: false },
            { label: "Usage", href: "#", active: false },
            { label: "Authorized Access", href: "#", active: false },
          ]}
        />

        <section className={surfaceCard}>
          <div className="border-b border-line-subtle px-6 py-5">
            <h2 className="font-semibold">Subscription Status</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Current status: <span className="font-medium text-ink">{status}</span>
            </p>
          </div>

          <div className="p-6">
            <SubscriptionForm tenantId={school.id} tenantName={school.name} current={status} />
          </div>

          <div className="mx-6 mb-6 border border-line bg-surface-muted p-4">
            <div className="text-sm font-medium">
              Changing status gates access at the authentication layer.
            </div>
            <div className="mt-1 text-sm text-ink-secondary">This action will be logged.</div>
          </div>
        </section>

        <section className={`mt-6 overflow-x-auto ${surfaceCard}`}>
          <div className="border-b border-line-subtle px-6 py-5">
            <h2 className="font-semibold">Subscription History</h2>
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
              {history.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-ink-secondary" colSpan={4}>
                    No subscription changes yet.
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.id} className="border-t border-line-subtle">
                    <td className="px-4 py-4">{formatWhen(row.created_at)}</td>
                    <td className="px-4 py-4">{row.from}</td>
                    <td className="px-4 py-4">{row.to}</td>
                    <td className="px-4 py-4">Platform admin</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
