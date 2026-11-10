import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonDownloadButton } from "@/components/student/LessonDownloadButton";
import { MaterialRow } from "@/components/student/MaterialRow";
import { PageHeader } from "@/components/shared/PageHeader";
import { getLessonDetails } from "@/lib/queries/student";
import { createClient } from "@/lib/supabase/server";
import { buttonSecondary } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Lesson Viewer",
};

const outlineButtonClass = `${buttonSecondary} min-h-11 px-3 text-xs`;

function formatPublished(value: string | null): string {
  if (!value) return "Published";
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
  return `Published ${formatted}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes >= 10 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
}

function kindLabel(kind: string): string {
  if (kind === "pdf") return "PDF";
  if (kind === "doc") return "Document";
  if (kind === "image") return "Image";
  if (kind === "external_video") return "External video";
  return "File";
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const lesson = await getLessonDetails(supabase, lessonId);
  if (!lesson) notFound();

  const paragraphs = (lesson.description ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <>
      <PageHeader
        variant="section"
        eyebrow={`${lesson.className} · ${lesson.subjectName}`}
        title={lesson.title}
      />

      <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 md:px-8">
        <p className="text-sm leading-6 text-ink-secondary">
          {formatPublished(lesson.publishedAt)}
        </p>

        <article className="max-w-prose">
          {paragraphs.length === 0 ? (
            <p className="text-base leading-7 text-ink-secondary">No description yet.</p>
          ) : (
            paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-4 break-words text-base leading-7 text-ink first:mt-0">
                {paragraph}
              </p>
            ))
          )}
        </article>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-ink">Materials</h2>
          {lesson.materials.length === 0 ? (
            <p className="text-sm leading-6 text-ink-secondary">No materials on this lesson.</p>
          ) : (
            <div className="space-y-2">
              {lesson.materials.map((material) => {
                const size = material.sizeBytes === null ? null : formatBytes(material.sizeBytes);
                const meta = [kindLabel(material.kind), size].filter(Boolean).join(" · ");
                return (
                  <MaterialRow
                    key={material.id}
                    title={material.name}
                    meta={meta}
                    action={
                      material.externalUrl ? (
                        <a
                          className={`inline-flex ${outlineButtonClass}`}
                          href={material.externalUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Watch
                        </a>
                      ) : material.downloadable ? (
                        <LessonDownloadButton materialId={material.id} />
                      ) : null
                    }
                  />
                );
              })}
            </div>
          )}
        </section>

        <Link href="/feed" className={`${buttonSecondary} w-full sm:w-auto`}>
          Back to Learning Feed
        </Link>
      </main>
    </>
  );
}
