import type { Metadata } from "next";
import { SetupProgressCard } from "@/components/admin/SetupProgressCard";
import { getAdminDashboard } from "@/lib/stubs/get-admin-dashboard";
import { buttonSecondary, surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "School Admin Dashboard",
};

export default function AdminDashboardPage() {
  const data = getAdminDashboard();

  return (
    <main className="min-w-0 flex-1">
      <header className="bg-brand-primary px-4 py-5 lg:px-8 lg:py-6 text-white">
        <p className="text-sm text-white/80">{data.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{data.title}</h1>
        <p className="mt-1 text-sm text-white/80">{data.subtitle}</p>
      </header>

      <div className="space-y-8 p-4 lg:p-8">
        <SetupProgressCard
          title={data.setupTitle}
          description={data.setupDescription}
          progressLabel={data.setupProgressLabel}
          items={data.setupItems}
        />

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-ink">{data.overviewTitle}</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.summaryTiles.map((tile) => (
              <div key={tile.id} className={`${surfaceCard} p-5`}>
                <p className="text-sm text-ink-secondary">{tile.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{tile.value}</p>
                <p className="mt-2 text-sm text-ink-muted">{tile.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${surfaceCard} p-6`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">{data.usageTitle}</h2>
              <p className="mt-1 text-sm text-ink-secondary">
                {data.usageDescription}
              </p>
            </div>

            <button type="button" className={buttonSecondary}>
              {data.usageActionLabel}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {data.usageMetrics.map((metric) => (
              <div key={metric.id} className="rounded-lg bg-surface-muted p-4">
                <p className="text-sm text-ink-secondary">{metric.label}</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-ink">{metric.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
