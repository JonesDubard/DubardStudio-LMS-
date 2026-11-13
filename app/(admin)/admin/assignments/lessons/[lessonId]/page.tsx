import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonReadOnly } from "@/components/content/LessonReadOnly";
import { getAdminLesson } from "@/lib/queries/admin-content";
import { createClient } from "@/lib/supabase/server";
import { buttonSecondary } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Lesson",
};

export default async function AdminLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const lesson = await getAdminLesson(supabase, lessonId);
  if (!lesson) notFound();

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 md:px-8 md:py-6">
        <p className="text-xs font-medium text-ink-muted">Content / Lesson</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
          {lesson.title}
        </h1>
      </header>
      <div className="mx-auto w-full max-w-3xl space-y-8 p-4 md:p-8">
        <LessonReadOnly lesson={lesson} />
        <Link href="/admin/assignments" className={`${buttonSecondary} w-full sm:w-auto`}>
          Back to content
        </Link>
      </div>
    </main>
  );
}
