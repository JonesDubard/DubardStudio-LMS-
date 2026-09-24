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
      <div className="mx-auto max-w-[1440px] p-8">
        <header className="mb-8 flex items-end justify-between gap-6">
          <div>
            <div className="text-sm text-[#666666]">{data.eyebrow}</div>
            <h1 className="mt-1 text-2xl font-semibold">{data.title}</h1>
            <p className="mt-2 text-sm text-[#666666]">{data.subtitle}</p>
          </div>

          <Link
            href="/platform/tenants/new"
            className="shrink-0 bg-[#333333] px-5 py-3 text-sm font-medium text-white"
          >
            {data.createLabel}
          </Link>
        </header>

        <FilterRow
          className="mb-5 border border-[#E5E5E5] p-4"
          gridClassName="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_auto_auto]"
          labelClassName="mb-2 block text-xs font-medium uppercase tracking-wide text-[#666666]"
          controlClassName="w-full border border-[#999999] bg-white px-3 py-2.5 text-sm"
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
            className="self-end border border-[#999999] px-4 py-2.5 text-sm"
          >
            {data.suspendLabel}
          </button>
          <button
            type="button"
            className="self-end border border-[#999999] px-4 py-2.5 text-sm"
          >
            {data.exportLabel}
          </button>
        </FilterRow>

        <DataTable
          wrapperClassName="overflow-x-auto border border-[#E5E5E5]"
          tableClassName="w-full min-w-[1050px] border-collapse text-sm"
          headerCellClassName="px-4 py-3 font-medium"
          bodyCellClassName="px-4 py-4"
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
              <span key="subdomain" className="text-[#666666]">
                {tenant.subdomainHost}
              </span>,
              <TenantStatusPill key="status" status={tenant.status} />,
              tenant.onboardingLabel,
              <span key="created" className="text-[#666666]">
                {tenant.createdDate}
              </span>,
              <Link
                key="action"
                href={`/platform/tenants/${tenant.id}`}
                className="inline-block border border-[#999999] px-3 py-2 text-xs"
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
