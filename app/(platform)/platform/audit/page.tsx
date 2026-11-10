import type { Metadata } from "next";
import { AuditLogRow } from "@/components/platform/AuditLogRow";
import { FilterRow } from "@/components/shared/FilterRow";
import { getAuditLog } from "@/lib/stubs/get-audit-log";
import { fieldControl, fieldLabel, surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Platform Admin — Audit Log",
};

export default function AuditLogPage() {
  const data = getAuditLog();

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1440px] p-4 lg:p-8">
        <header className="mb-8">
          <p className="text-xs font-medium text-ink-muted">{data.eyebrow}</p>
          <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
            {data.title}
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">{data.subtitle}</p>
        </header>

        <FilterRow
          className={`mb-5 p-4 ${surfaceCard}`}
          gridClassName="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
          labelClassName={fieldLabel}
          controlClassName={fieldControl}
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

        <section className={`overflow-x-auto ${surfaceCard}`}>
          <table className="w-full min-w-[1150px] border-collapse text-sm">
            <thead className="border-b border-line bg-surface text-left text-sm font-medium text-ink-secondary">
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
