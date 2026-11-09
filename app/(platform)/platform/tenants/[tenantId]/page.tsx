import type { Metadata } from "next";
import Link from "next/link";
import { TenantStatusPill } from "@/components/platform/TenantStatusPill";
import { ElevatedAccessBanner } from "@/components/shared/ElevatedAccessBanner";
import { TabBar } from "@/components/shared/TabBar";
import { getTenant } from "@/lib/stubs/get-tenant";

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
      <div className="mx-auto max-w-[1440px] p-4 md:p-8">
        <ElevatedAccessBanner tenantName={tenant.name} />

        <header className="mb-6 flex items-end justify-between gap-6">
          <div>
            <div className="text-sm text-ink-secondary">
              Tenants / {tenant.name}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{tenant.name}</h1>
              <TenantStatusPill status={tenant.status} />
            </div>
            <p className="mt-2 text-sm text-ink-secondary">
              {tenant.subdomainHost}
            </p>
          </div>

          <Link
            href="/platform/audit"
            className="border border-line px-4 py-2.5 text-sm"
          >
            {tenant.auditButtonLabel}
          </Link>
        </header>

        <TabBar tabs={tenant.tabs} />

        <section className="border border-line-subtle">
          <div className="flex items-center justify-between border-b border-line-subtle px-6 py-5">
            <div>
              <h2 className="font-semibold">School Information</h2>
              <p className="mt-1 text-sm text-ink-secondary">
                Core information for this tenant.
              </p>
            </div>
            <button
              type="button"
              className="border border-line px-4 py-2.5 text-sm"
            >
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
