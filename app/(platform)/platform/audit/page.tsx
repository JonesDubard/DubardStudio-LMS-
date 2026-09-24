import type { Metadata } from "next";
import { AuditLogRow } from "@/components/platform/AuditLogRow";
import { FilterRow } from "@/components/shared/FilterRow";
import { getAuditLog } from "@/lib/stubs/get-audit-log";

export const metadata: Metadata = {
  title: "Platform Admin — Audit Log",
};

export default function AuditLogPage() {
  const data = getAuditLog();

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1440px] p-8">
        <header className="mb-8">
          <div className="text-sm text-[#666666]">{data.eyebrow}</div>
          <h1 className="mt-1 text-2xl font-semibold">{data.title}</h1>
          <p className="mt-2 text-sm text-[#666666]">{data.subtitle}</p>
        </header>

        <FilterRow
          className="mb-5 border border-[#E5E5E5] p-4"
          gridClassName="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
          labelClassName="mb-2 block text-xs font-medium uppercase tracking-wide text-[#666666]"
          controlClassName="w-full border border-[#999999] bg-white px-3 py-2.5 text-sm"
          textFields={[
            {
              id: "date-range",
              label: "Date Range",
              defaultValue: data.dateRangeValue,
            },
          ]}
          fields={[
            {
              id: "admin",
              label: "Admin",
              options: data.adminOptions.map((option) => ({
                value: option,
                label: option,
              })),
            },
            {
              id: "tenant",
              label: "Tenant",
              options: data.tenantOptions.map((option) => ({
                value: option,
                label: option,
              })),
            },
            {
              id: "action",
              label: "Action Type",
              options: data.actionOptions.map((option) => ({
                value: option,
                label: option,
              })),
            },
          ]}
        />

        <section className="overflow-x-auto border border-[#E5E5E5]">
          <table className="w-full min-w-[1150px] border-collapse text-sm">
            <thead className="bg-[#E5E5E5] text-left">
              <tr>
                <th className="w-12 px-4 py-3 font-medium" />
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((event) => (
                <AuditLogRow key={event.id} event={event} />
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
