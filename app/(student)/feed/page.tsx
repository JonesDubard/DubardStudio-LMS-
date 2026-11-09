import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { FeedCard } from "@/components/student/FeedCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { getStudentFeed } from "@/lib/queries/student";
import { createClient } from "@/lib/supabase/server";
import { buttonSecondary } from "@/lib/ui/styles";

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
          className="border-b border-line bg-surface-muted px-4 py-2 font-mono text-xs tracking-normal text-ink-secondary"
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
            <h2 className="text-base font-semibold tracking-tight text-ink">
              {feed.todayLabel}
            </h2>
            <span className="text-xs text-ink-muted">{feed.todayDate}</span>
          </div>

          {!feed.enrolled ? (
            <EmptyState
              icon={Inbox}
              title="You are not enrolled in any classes yet."
            />
          ) : feed.items.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No published lessons or upcoming assignments yet."
            />
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
                    className={`${buttonSecondary} min-h-11 w-full`}
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
            <h2 className="text-base font-semibold tracking-tight text-ink">
              {feed.recentlyViewedLabel}
            </h2>
            <span className="text-xs text-ink-muted">
              {feed.recentlyViewedCountLabel}
            </span>
          </div>
          <p className="text-sm text-ink-secondary">No lessons viewed yet.</p>
        </section>
      </main>
    </>
  );
}
