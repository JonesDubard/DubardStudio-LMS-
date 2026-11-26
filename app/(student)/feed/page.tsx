import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardList, Inbox } from "lucide-react";
import { AnnouncementCard } from "@/components/shared/AnnouncementCard";
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

const previewAnnouncements = [
  {
    category: "Assignment",
    title: "Reading response due soon",
    description: "Remember to complete your English reading response.",
    icon: ClipboardList,
  },
  {
    category: "General Assembly",
    title: "School assembly",
    description: "Join your school community for the next general assembly.",
    icon: CalendarDays,
  },
];

function FeedSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-ink md:text-base">
        {title}
      </h2>
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

      <main className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-start gap-5 px-4 py-4 md:px-8 md:py-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)] lg:gap-6">
        <p className="col-span-full text-xs text-ink-muted">{feed.todayDate}</p>

        <div className="space-y-6 lg:col-start-1 lg:row-start-2">
          {!feed.enrolled ? (
            <EmptyState icon={Inbox} title="You are not enrolled in any classes yet." />
          ) : feed.items.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No published lessons or upcoming assignments yet."
            />
          ) : (
            <div className="space-y-6">
              {assignments.length > 0 ? (
                <FeedSection title="To hand in">
                  <div className="grid grid-cols-1 gap-3">{assignments.map(renderItem)}</div>
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

          <p className="text-xs text-ink-muted">
            {feed.recentlyViewedLabel} · No lessons viewed yet.
          </p>
        </div>

        <div className="lg:col-start-2 lg:row-start-2">
          <FeedSection title="Notices & Due Dates">
            <p className="text-[10px] text-ink-muted">Sample notices</p>
            <div className="grid grid-cols-1 gap-3">
              {previewAnnouncements.map((announcement) => (
                <AnnouncementCard key={announcement.category} {...announcement} />
              ))}
            </div>
          </FeedSection>
        </div>
      </main>
    </>
  );
}
