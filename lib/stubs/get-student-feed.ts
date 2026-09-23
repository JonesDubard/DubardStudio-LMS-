export interface FeedLessonItem {
  kind: "lesson";
  id: string;
  eyebrow: string;
  title: string;
  meta: string;
  description: string;
  actionLabel: string;
}

export interface FeedAssignmentItem {
  kind: "assignment";
  id: string;
  eyebrow: string;
  title: string;
  meta: string;
  badge: string;
  actionLabel: string;
}

export type StudentFeedItem = FeedLessonItem | FeedAssignmentItem;

export interface RecentlyViewedItem {
  title: string;
  meta: string;
  actionLabel: string;
}

export interface StudentFeed {
  eyebrow: string;
  greeting: string;
  todayLabel: string;
  todayDate: string;
  items: StudentFeedItem[];
  recentlyViewedLabel: string;
  recentlyViewedCountLabel: string;
  recentlyViewed: RecentlyViewedItem[];
}

export function getStudentFeed(): StudentFeed {
  return {
    eyebrow: "Student Home",
    greeting: "Good morning, Daniel",
    todayLabel: "TODAY",
    todayDate: "Wednesday, Sep 23",
    items: [
      {
        kind: "lesson",
        id: "1",
        eyebrow: "New Lesson",
        title: "Mathematics — Fractions",
        meta: "Week 3 · Mathematics",
        description:
          "Adding and subtracting fractions with different denominators.",
        actionLabel: "Open Lesson",
      },
      {
        kind: "assignment",
        id: "1",
        eyebrow: "Assignment Due Tomorrow",
        title: "English — Reading Response",
        meta: "English · Due Sep 24, 8:00 PM",
        badge: "DUE SOON",
        actionLabel: "Open Assignment",
      },
    ],
    recentlyViewedLabel: "RECENTLY VIEWED",
    recentlyViewedCountLabel: "2 lessons",
    recentlyViewed: [
      {
        title: "Science — States of Matter",
        meta: "Science · Viewed yesterday",
        actionLabel: "OPEN",
      },
      {
        title: "History — The Liberian Republic",
        meta: "History · Viewed Sep 21",
        actionLabel: "OPEN",
      },
    ],
  };
}
