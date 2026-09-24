import type { Metadata } from "next";
import { OnboardingProgressCell } from "@/components/platform/OnboardingProgressCell";
import { TenantStatusPill } from "@/components/platform/TenantStatusPill";
import { TenantSummaryTile } from "@/components/platform/TenantSummaryTile";
import { getPlatformDashboard } from "@/lib/stubs/get-platform-dashboard";

export const metadata: Metadata = {
  title: "Platform Admin — Dashboard",
};

export default function PlatformDashboardPage() {
  const data = getPlatformDashboard();

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1440px] p-8">
        <header className="mb-8">
          <div className="text-sm text-[#666666]">{data.eyebrow}</div>
          <h1 className="mt-1 text-2xl font-semibold">{data.title}</h1>
          <p className="mt-2 text-sm text-[#666666]">{data.subtitle}</p>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {data.summaryTiles.map((tile) => (
            <TenantSummaryTile
              key={tile.id}
              label={tile.label}
              value={tile.value}
            />
          ))}
        </section>

        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">{data.onboardingTitle}</h2>
              <p className="mt-1 text-sm text-[#666666]">
                {data.onboardingDescription}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#E5E5E5]">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="bg-[#E5E5E5] text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Subscription</th>
                  <th className="px-4 py-3 font-medium">Branding</th>
                  <th className="px-4 py-3 font-medium">Academic</th>
                  <th className="px-4 py-3 font-medium">Teachers Invited</th>
                  <th className="px-4 py-3 font-medium">First Lesson</th>
                </tr>
              </thead>
              <tbody>
                {data.onboardingRows.map((row) => (
                  <tr key={row.id} className="border-t border-[#E5E5E5]">
                    <td className="px-4 py-4 font-medium">{row.name}</td>
                    <td className="px-4 py-4">
                      <TenantStatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-4">
                      <OnboardingProgressCell complete={row.branding} />
                    </td>
                    <td className="px-4 py-4">
                      <OnboardingProgressCell complete={row.academic} />
                    </td>
                    <td className="px-4 py-4">
                      <OnboardingProgressCell complete={row.teachersInvited} />
                    </td>
                    <td className="px-4 py-4">
                      <OnboardingProgressCell complete={row.firstLesson} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border border-[#E5E5E5]">
          <div className="border-b border-[#E5E5E5] px-5 py-4">
            <h2 className="font-semibold">{data.recentAuditTitle}</h2>
          </div>

          <div className="divide-y divide-[#E5E5E5]">
            {data.recentAuditItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="mt-1 text-xs text-[#666666]">
                    {item.detail}
                  </div>
                </div>
                <div className="text-xs text-[#666666]">{item.timestamp}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
