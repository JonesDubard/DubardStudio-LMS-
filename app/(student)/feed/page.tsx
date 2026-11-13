import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { FeedCard } from "@/components/student/FeedCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { getStudentFeed, type StudentFeedItem } from "@/lib/queries/student";
import { createClient } from "@/lib/supabase/server";
import { buttonSecondary } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Student Feed",
};

function FeedSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}

function renderItem(item: StudentFeedItem) {
  if (item.kind === "lesson") {
    return (
      <FeedCard
        key={`${item.kind}-${item.id}`}
        eyebrow={item.eyebrow}
        title={item.title}
        meta={item.meta}
        description={item.description}
        showMark
      >
        <PrimaryButton href={`/lessons/${item.id}`} variant="feed">
          {item.actionLabel}
        </PrimaryButton>
      </FeedCard>
    );
  }

  return (
    <FeedCard
      key={`${item.kind}-${item.id}`}
      eyebrow={item.eyebrow}
      title={item.title}
      meta={item.meta}
      badge={item.badge}
    >
      <Link href={`/assignments/${item.id}`} className={`${buttonSecondary} min-h-11 w-full`}>
        {item.actionLabel}
      </Link>
    </FeedCard>
  );
}

export default async function StudentFeedPage() {
  const supabase = await createClient();
  const feed = await getStudentFeed(supabase);
  const assignments = feed.items.filter((item) => item.kind === "assignment");
  const lessons = feed.items.filter((item) => item.kind === "lesson");

  return (
    <>
      <PageHeader variant="greeting" eyebrow={feed.eyebrow} title={feed.greeting} />

      <main className="space-y-8 px-4 py-6 md:px-8">
        <p className="text-sm text-ink-muted">{feed.todayDate}</p>

        {!feed.enrolled ? (
          <EmptyState icon={Inbox} title="You are not enrolled in any classes yet." />
        ) : feed.items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No published lessons or upcoming assignments yet."
          />
        ) : (
          <div className="space-y-8">
            {assignments.length > 0 ? (
              <FeedSection title="To hand in">
                <div className="grid max-w-3xl grid-cols-1 gap-3">{assignments.map(renderItem)}</div>
              </FeedSection>
            ) : null}
            {lessons.length > 0 ? (
              <FeedSection title="Lessons">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {lessons.map(renderItem)}
                </div>
              </FeedSection>
            ) : null}
          </div>
        )}

        <p className="text-sm text-ink-muted">
          {feed.recentlyViewedLabel} · No lessons viewed yet.
        </p>
      </main>
    </>
  );
}
