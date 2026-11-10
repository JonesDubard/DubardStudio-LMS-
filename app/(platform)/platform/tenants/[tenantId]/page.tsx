import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TenantStatusPill } from "@/components/platform/TenantStatusPill";
import { ElevatedAccessBanner } from "@/components/shared/ElevatedAccessBanner";
import { TabBar } from "@/components/shared/TabBar";
import { assertPlatformAdmin, getSchool, subscriptionLabel } from "@/lib/platform/schools";
import { surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Platform Admin — Tenant Detail",
};

type TenantDetailPageProps = {
  params: Promise<{ tenantId: string }>;
};

function formatCreated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { tenantId } = await params;
  await assertPlatformAdmin();
  const school = await getSchool(tenantId);
  if (!school) notFound();
  const status = subscriptionLabel(school.subscription_status);
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
            { label: "Profile", href: `/platform/tenants/${school.id}`, active: true },
            {
              label: "Subscription",
              href: `/platform/tenants/${school.id}/subscription`,
              active: false,
            },
          ]}
        />

        <section className={surfaceCard}>
          <div className="border-b border-line-subtle px-4 py-5 sm:px-6">
            <h2 className="font-semibold">School Information</h2>
            <p className="mt-1 text-sm text-ink-secondary">Core information for this tenant.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">School Name</div>
              <div className="mt-2 text-sm font-medium">{school.name}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">Subdomain</div>
              <div className="mt-2 text-sm">
                {school.subdomain}.{root}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">Created</div>
              <div className="mt-2 text-sm">{formatCreated(school.created_at)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">Onboarding</div>
              <div className="mt-2 text-sm capitalize">
                {school.onboarding_status.replaceAll("_", " ")}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">Subscription</div>
              <div className="mt-2">
                <TenantStatusPill status={status} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
