import type { Metadata } from "next";
import Link from "next/link";
import { TenantStatusPill } from "@/components/platform/TenantStatusPill";
import { DataTable } from "@/components/shared/DataTable";
import { FilterRow } from "@/components/shared/FilterRow";
import { getTenants } from "@/lib/stubs/get-tenants";

export const metadata: Metadata = {
  title: "Platform Admin — Tenants",
};

export default function PlatformTenantsPage() {
  const data = getTenants();

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1440px] p-4 md:p-8">
        <header className="mb-8 flex items-end justify-between gap-6">
          <div>
            <div className="text-sm text-ink-secondary">{data.eyebrow}</div>
            <h1 className="mt-1 text-2xl font-semibold">{data.title}</h1>
            <p className="mt-2 text-sm text-ink-secondary">{data.subtitle}</p>
          </div>

          <Link
            href="/platform/tenants/new"
            className="shrink-0 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent bg-brand-primary px-4 py-2.5 text-sm font-semibold tracking-tight text-white transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {data.createLabel}
          </Link>
        </header>

        <FilterRow
          className="mb-5 border border-line-subtle p-4"
          gridClassName="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_auto_auto]"
          labelClassName="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-secondary"
          controlClassName="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink shadow-card transition-colors duration-150 placeholder:text-ink-disabled hover:border-line-strong focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-ring disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-ink-disabled.5 text-sm"
          fields={[
            {
              id: "status",
              label: "Status",
              options: data.statusFilterOptions.map((option) => ({
                value: option,
                label: option,
              })),
            },
          ]}
          search={{
            id: "search",
            label: "Search by name or subdomain",
            placeholder: data.searchPlaceholder,
          }}
        >
          <button
            type="button"
            className="self-end border border-line px-4 py-2.5 text-sm"
          >
            {data.suspendLabel}
          </button>
          <button
            type="button"
            className="self-end border border-line px-4 py-2.5 text-sm"
          >
            {data.exportLabel}
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
          rows={data.tenants.map((tenant) => ({
            id: tenant.id,
            cells: [
              <span key="name" className="font-medium">
                {tenant.name}
              </span>,
              <span key="subdomain" className="text-ink-secondary">
                {tenant.subdomainHost}
              </span>,
              <TenantStatusPill key="status" status={tenant.status} />,
              tenant.onboardingLabel,
              <span key="created" className="text-ink-secondary">
                {tenant.createdDate}
              </span>,
              <Link
                key="action"
                href={`/platform/tenants/${tenant.id}`}
                className="inline-block inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold tracking-tight text-ink shadow-card transition-colors duration-150 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-xs"
              >
                View Tenant
              </Link>,
            ],
          }))}
        />
      </div>
    </main>
  );
}
