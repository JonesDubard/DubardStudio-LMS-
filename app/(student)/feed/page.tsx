import type { Metadata } from "next";
import Link from "next/link";
import { FeedCard } from "@/components/student/FeedCard";
import { RecentlyViewedRow } from "@/components/student/RecentlyViewedRow";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { getStudentFeed } from "@/lib/stubs/get-student-feed";

export const metadata: Metadata = {
  title: "Student Feed",
};

export default function StudentFeedPage() {
  const feed = getStudentFeed();

  return (
    <>
      <PageHeader
        variant="greeting"
        eyebrow={feed.eyebrow}
        title={feed.greeting}
      />

      <main className="space-y-5 px-4 py-5">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">{feed.todayLabel}</h2>
            <span className="text-xs text-[#666666]">{feed.todayDate}</span>
          </div>

          {feed.items.map((item) =>
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
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">{feed.recentlyViewedLabel}</h2>
            <span className="text-xs text-[#666666]">
              {feed.recentlyViewedCountLabel}
            </span>
          </div>

          <div className="space-y-2">
            {feed.recentlyViewed.map((item) => (
              <RecentlyViewedRow
                key={item.title}
                title={item.title}
                meta={item.meta}
                actionLabel={item.actionLabel}
              />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
