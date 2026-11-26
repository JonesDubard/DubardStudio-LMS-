import type { Metadata } from "next";
import Link from "next/link";
import { Database, School, Users } from "lucide-react";
import {
  TenantStatusPill,
  tenantAccentClass,
  tenantAvatarClass,
} from "@/components/platform/TenantStatusPill";
import { TenantSummaryTile } from "@/components/platform/TenantSummaryTile";
import { UsageKpiCard } from "@/components/shared/UsageKpiCard";
import { assertPlatformAdmin, listSchools, subscriptionLabel } from "@/lib/platform/schools";
import { buttonSecondary, surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Platform Admin — Dashboard",
};

const STATUSES = ["trial", "active", "suspended", "cancelled"] as const;

// MOCK DATA: Replace with the Platform Admin usage RPC response when ready.
// TODO: Connect to backend RPC when ready.
const platformUsagePreview = {
  activeSchools: 32,
  activeUsers: 14680,
  storageUsedGb: 1.8,
};

export default async function PlatformDashboardPage() {
  await assertPlatformAdmin();
  const schools = await listSchools();
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<
    (typeof STATUSES)[number],
    number
  >;
  for (const school of schools) {
    if (school.subscription_status in counts) {
      counts[school.subscription_status as (typeof STATUSES)[number]] += 1;
    }
  }

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1440px] p-4 lg:p-8">
        <header className="mb-8">
          <p className="text-xs font-medium text-ink-muted">Platform Admin</p>
          <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">Schools on this platform.</p>
        </header>

        <section aria-labelledby="platform-usage-title" className="mb-8 space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="platform-usage-title"
                className="text-lg font-semibold tracking-tight text-ink"
              >
                Platform usage
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">
                Aggregate activity across all schools.
              </p>
            </div>
            <span className="w-fit rounded-full border border-brand-border bg-brand-subtle px-2.5 py-1 text-xs font-medium text-brand-primary">
              Preview metrics · Sample data
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <UsageKpiCard
              label="Total Active Schools"
              value={platformUsagePreview.activeSchools.toLocaleString()}
              detail="Active subscriptions"
              icon={School}
            />
            <UsageKpiCard
              label="Total Active Users"
              value={platformUsagePreview.activeUsers.toLocaleString()}
              detail="Across active schools"
              icon={Users}
            />
            <UsageKpiCard
              label="Total Storage Used (GB)"
              value={platformUsagePreview.storageUsedGb.toFixed(1)}
              detail="Aggregate file storage"
              icon={Database}
            />
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <TenantSummaryTile label="Total tenants" value={String(schools.length)} />
          <TenantSummaryTile label="Trial" value={String(counts.trial)} />
          <TenantSummaryTile label="Active" value={String(counts.active)} />
          <TenantSummaryTile label="Suspended" value={String(counts.suspended)} />
          <TenantSummaryTile label="Cancelled" value={String(counts.cancelled)} />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Schools</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Subscription and onboarding status for each school.
            </p>
          </div>
          {schools.length === 0 ? (
            <p className={`${surfaceCard} px-4 py-6 text-sm text-ink-secondary`}>No schools yet.</p>
          ) : (
            <>
              <ul className="grid gap-3 md:hidden">
                {schools.map((school) => {
                  const status = subscriptionLabel(school.subscription_status);
                  return (
                    <li
                      key={school.id}
                      className={`${surfaceCard} space-y-3 border-l-4 ${tenantAccentClass(status)} p-4`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${tenantAvatarClass(status)}`}
                            aria-hidden
                          >
                            {school.name.charAt(0).toUpperCase()}
                          </span>
                          <p className="break-words font-semibold tracking-tight text-ink">
                            {school.name}
                          </p>
                        </div>
                        <TenantStatusPill status={status} />
                      </div>
                      <p className="text-sm capitalize text-ink-secondary">
                        {school.onboarding_status.replaceAll("_", " ")}
                      </p>
                      <Link
                        href={`/platform/tenants/${school.id}`}
                        className={`${buttonSecondary} w-full`}
                      >
                        Overview
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className={`hidden overflow-x-auto md:block ${surfaceCard}`}>
                <table className="w-full border-collapse text-sm">
                  <thead className="border-b border-line bg-surface-muted text-left text-xs font-medium text-ink-secondary">
                    <tr>
                      <th className="px-4 py-3 font-medium">Tenant</th>
                      <th className="px-4 py-3 font-medium">Subscription</th>
                      <th className="px-4 py-3 font-medium">Onboarding</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schools.map((school) => (
                      <tr key={school.id} className="border-t border-line-subtle">
                        <td className="px-4 py-4 font-medium">
                          <Link
                            href={`/platform/tenants/${school.id}`}
                            className="text-brand-primary hover:underline"
                          >
                            {school.name}
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <TenantStatusPill status={subscriptionLabel(school.subscription_status)} />
                        </td>
                        <td className="px-4 py-4 capitalize">
                          {school.onboarding_status.replaceAll("_", " ")}
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            href={`/platform/tenants/${school.id}`}
                            className={buttonSecondary}
                          >
                            Overview
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
