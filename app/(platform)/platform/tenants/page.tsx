import type { Metadata } from "next";
import Link from "next/link";
import { TenantStatusPill } from "@/components/platform/TenantStatusPill";
import { DataTable } from "@/components/shared/DataTable";
import { FilterRow } from "@/components/shared/FilterRow";
import { getTenants } from "@/lib/stubs/get-tenants";
import { buttonPrimary, buttonSecondary, fieldControl, fieldLabel, surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Platform Admin — Tenants",
};

export default function PlatformTenantsPage() {
  const data = getTenants();

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1440px] p-4 lg:p-8">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">{data.eyebrow}</p>
            <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
              {data.title}
            </h1>
            <p className="mt-2 text-sm text-ink-secondary">{data.subtitle}</p>
          </div>

          <Link href="/platform/tenants/new" className={buttonPrimary}>
            {data.createLabel}
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
          <button type="button" className={`${buttonSecondary} self-end`}>
            {data.suspendLabel}
          </button>
          <button type="button" className={`${buttonSecondary} self-end`}>
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
                className={buttonSecondary}
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
