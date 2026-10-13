import type { Metadata } from "next";
import { SetupProgressCard } from "@/components/admin/SetupProgressCard";
import { getAdminDashboard } from "@/lib/stubs/get-admin-dashboard";

export const metadata: Metadata = {
  title: "School Admin Dashboard",
};

export default function AdminDashboardPage() {
  const data = getAdminDashboard();

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b-4 border-brand-secondary bg-brand-primary px-8 py-6 text-white">
        <p className="text-sm">{data.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.title}</h1>
        <p className="mt-1 text-sm">{data.subtitle}</p>
      </header>

      <div className="space-y-8 p-8">
        <SetupProgressCard
          title={data.setupTitle}
          description={data.setupDescription}
          progressLabel={data.setupProgressLabel}
          items={data.setupItems}
        />

        <section>
          <h2 className="text-lg font-semibold">{data.overviewTitle}</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.summaryTiles.map((tile) => (
              <div
                key={tile.id}
                className="border border-[#999999] bg-white p-5"
              >
                <p className="text-sm text-[#666666]">{tile.label}</p>
                <p className="mt-2 text-3xl font-semibold">{tile.value}</p>
                <p className="mt-2 text-sm text-[#666666]">{tile.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-[#999999] bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{data.usageTitle}</h2>
              <p className="mt-1 text-sm text-[#666666]">
                {data.usageDescription}
              </p>
            </div>

            <button
              type="button"
              className="border border-[#999999] px-4 py-2 text-sm"
            >
              {data.usageActionLabel}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {data.usageMetrics.map((metric) => (
              <div key={metric.id} className="border border-[#999999] p-4">
                <p className="text-sm text-[#666666]">{metric.label}</p>
                <p className="mt-2 text-xl font-semibold">{metric.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
