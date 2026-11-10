import type { Metadata } from "next";
import Link from "next/link";
import { TenantStatusPill } from "@/components/platform/TenantStatusPill";
import { ElevatedAccessBanner } from "@/components/shared/ElevatedAccessBanner";
import { TabBar } from "@/components/shared/TabBar";
import { getTenant } from "@/lib/stubs/get-tenant";
import { buttonSecondary, surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Platform Admin — Tenant Detail",
};

type TenantDetailPageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function TenantDetailPage({
  params,
}: TenantDetailPageProps) {
  const { tenantId } = await params;
  const tenant = getTenant(tenantId);

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1440px] p-4 lg:p-8">
        <ElevatedAccessBanner tenantName={tenant.name} />

        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">Tenants / {tenant.name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="break-words text-xl font-semibold tracking-tight md:text-2xl">
                {tenant.name}
              </h1>
              <TenantStatusPill status={tenant.status} />
            </div>
            <p className="mt-2 text-sm text-ink-secondary">{tenant.subdomainHost}</p>
          </div>

          <Link href="/platform/audit" className={buttonSecondary}>
            {tenant.auditButtonLabel}
          </Link>
        </header>

        <TabBar tabs={tenant.tabs} />

        <section className={surfaceCard}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-4 py-5 sm:px-6">
            <div>
              <h2 className="font-semibold">School Information</h2>
              <p className="mt-1 text-sm text-ink-secondary">
                Core information for this tenant.
              </p>
            </div>
            <button type="button" className={buttonSecondary}>
              {tenant.editButtonLabel}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">
                School Name
              </div>
              <div className="mt-2 text-sm font-medium">{tenant.name}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">
                Contact Person
              </div>
              <div className="mt-2 text-sm">{tenant.contactPerson}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">
                Contact Email
              </div>
              <div className="mt-2 text-sm">{tenant.contactEmail}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">
                Subdomain
              </div>
              <div className="mt-2 text-sm">{tenant.subdomainHost}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">
                Created
              </div>
              <div className="mt-2 text-sm">{tenant.createdAt}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">
                Subscription
              </div>
              <div className="mt-2">
                <TenantStatusPill status={tenant.status} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 border border-line-subtle p-5">
          <div className="text-sm font-medium">
            {tenant.elevatedReminderTitle}
          </div>
          <p className="mt-2 text-sm text-ink-secondary">
            {tenant.elevatedReminderBody}
          </p>
        </section>
      </div>
    </main>
  );
}
