import type { Metadata } from "next";
import Link from "next/link";
import { TenantStatusPill } from "@/components/platform/TenantStatusPill";
import { DataTable } from "@/components/shared/DataTable";
import { FilterRow } from "@/components/shared/FilterRow";
import { assertPlatformAdmin, listSchools, subscriptionLabel } from "@/lib/platform/schools";
import { buttonPrimary, buttonSecondary, fieldControl, fieldLabel, surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Platform Admin — Tenants",
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

export default async function PlatformTenantsPage() {
  await assertPlatformAdmin();
  const schools = await listSchools();
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "localhost";

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1440px] p-4 lg:p-8">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">Platform Admin</p>
            <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
              Tenants
            </h1>
            <p className="mt-2 text-sm text-ink-secondary">
              Manage tenant records and access status.
            </p>
          </div>

          <Link href="/platform/tenants/new" className={buttonPrimary}>
            + Create Tenant
          </Link>
        </header>

        <FilterRow
          className={`mb-5 p-4 ${surfaceCard}`}
          gridClassName="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto_auto]"
          labelClassName={fieldLabel}
          controlClassName={fieldControl}
          fields={[
            {
              id: "status",
              label: "Status",
              options: ["All", "Trial", "Active", "Suspended", "Cancelled"].map((option) => ({
                value: option,
                label: option,
              })),
            },
          ]}
          search={{
            id: "search",
            label: "Search by name or subdomain",
            placeholder: "Search tenants...",
          }}
        >
          <button type="button" disabled className={`${buttonSecondary} self-end`}>
            Suspend
          </button>
          <button type="button" disabled className={`${buttonSecondary} self-end`}>
            Export
          </button>
        </FilterRow>

        <DataTable
          wrapperClassName="overflow-x-auto rounded-lg border border-line bg-surface shadow-card"
          tableClassName="w-full min-w-[1050px] border-collapse text-sm"
          headerCellClassName="px-4 py-3 font-medium"
          bodyCellClassName="px-4 py-3"
          columns={[
            { key: "name", header: "Tenant Name" },
            { key: "subdomain", header: "Subdomain" },
            { key: "status", header: "Subscription Status" },
            { key: "onboarding", header: "Onboarding Progress" },
            { key: "created", header: "Created" },
            { key: "actions", header: "Actions" },
          ]}
          rows={schools.map((tenant) => ({
            id: tenant.id,
            cells: [
              <span key="name" className="font-medium">
                {tenant.name}
              </span>,
              <span key="subdomain" className="text-ink-secondary">
                {tenant.subdomain}.{root}
              </span>,
              <TenantStatusPill key="status" status={subscriptionLabel(tenant.subscription_status)} />,
              tenant.onboarding_status.replaceAll("_", " "),
              <span key="created" className="text-ink-secondary">
                {formatCreated(tenant.created_at)}
              </span>,
              <Link
                key="action"
                href={`/platform/tenants/${tenant.id}/subscription`}
                className={buttonSecondary}
              >
                Subscription
              </Link>,
            ],
          }))}
        />
      </div>
    </main>
  );
}
