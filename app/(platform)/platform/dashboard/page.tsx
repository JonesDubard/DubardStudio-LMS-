import type { Metadata } from "next";
import Link from "next/link";
import { TenantStatusPill } from "@/components/platform/TenantStatusPill";
import { TenantSummaryTile } from "@/components/platform/TenantSummaryTile";
import { assertPlatformAdmin, listSchools, subscriptionLabel } from "@/lib/platform/schools";
import { buttonSecondary, surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Platform Admin — Dashboard",
};

const STATUSES = ["trial", "active", "suspended", "cancelled"] as const;

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
          <div className={`overflow-x-auto ${surfaceCard}`}>
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead className="border-b border-line bg-surface text-left text-xs font-medium text-ink-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Subscription</th>
                  <th className="px-4 py-3 font-medium">Onboarding</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-ink-secondary" colSpan={4}>
                      No schools yet.
                    </td>
                  </tr>
                ) : (
                  schools.map((school) => (
                    <tr key={school.id} className="border-t border-line-subtle">
                      <td className="px-4 py-4 font-medium">{school.name}</td>
                      <td className="px-4 py-4">
                        <TenantStatusPill status={subscriptionLabel(school.subscription_status)} />
                      </td>
                      <td className="px-4 py-4 capitalize">
                        {school.onboarding_status.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/platform/tenants/${school.id}/subscription`}
                          className={buttonSecondary}
                        >
                          Subscription
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
