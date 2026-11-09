import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { FeedCard } from "@/components/student/FeedCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { getStudentFeed } from "@/lib/queries/student";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Student Feed",
};

async function readDevAuthBanner() {
  const headerStore = await headers();
  return {
    appRoles: headerStore.get("x-app-roles") ?? "(none)",
    tenantId: headerStore.get("x-tenant-id") ?? "(none)",
  };
}

export default async function StudentFeedPage() {
  const supabase = await createClient();
  const feed = await getStudentFeed(supabase);
  const devAuth =
    process.env.NODE_ENV === "development" ? await readDevAuthBanner() : null;

  return (
    <>
      {devAuth ? (
        <p
          data-testid="auth-dev-banner"
          className="border-b border-[#E5E5E5] bg-[#E5E5E5] px-4 py-2 font-mono text-xs text-[#333333]"
        >
          app_roles={devAuth.appRoles} tenant_id={devAuth.tenantId}
        </p>
      ) : null}
      <PageHeader
        variant="greeting"
        eyebrow={feed.eyebrow}
        title={feed.greeting}
      />

      <main className="space-y-5 px-4 py-5">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-brand-primary">{feed.todayLabel}</h2>
            <span className="text-xs text-[#666666]">{feed.todayDate}</span>
          </div>

          {!feed.enrolled ? (
            <p className="border border-[#999999] bg-white px-4 py-6 text-sm">
              You are not enrolled in any classes yet.
            </p>
          ) : feed.items.length === 0 ? (
            <p className="border border-[#999999] bg-white px-4 py-6 text-sm">
              No published lessons or upcoming assignments yet.
            </p>
          ) : (
            feed.items.map((item) =>
              item.kind === "lesson" ? (
                <FeedCard
                  key={`${item.kind}-${item.id}`}
                  eyebrow={item.eyebrow}
                  title={item.title}
                  meta={item.meta}
                  description={item.description}
                  showMark
                  className="mb-3"
                >
                  <PrimaryButton href={`/lessons/${item.id}`} variant="feed">
                    {item.actionLabel}
                  </PrimaryButton>
                </FeedCard>
              ) : (
                <FeedCard
                  key={`${item.kind}-${item.id}`}
                  eyebrow={item.eyebrow}
                  title={item.title}
                  meta={item.meta}
                  badge={item.badge}
                >
                  <Link
                    href={`/assignments/${item.id}`}
                    className="block min-h-11 w-full border border-[#333333] bg-[#E5E5E5] px-4 py-2 text-center text-sm font-semibold text-[#333333]"
                  >
                    {item.actionLabel}
                  </Link>
                </FeedCard>
              ),
            )
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">{feed.recentlyViewedLabel}</h2>
            <span className="text-xs text-[#666666]">
              {feed.recentlyViewedCountLabel}
            </span>
          </div>
          <p className="text-xs text-[#666666]">No lessons viewed yet.</p>
        </section>
      </main>
    </>
  );
}
