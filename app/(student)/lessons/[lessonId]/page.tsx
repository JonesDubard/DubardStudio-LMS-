import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MaterialRow } from "@/components/student/MaterialRow";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { getLessonDetails } from "@/lib/queries/student";
import { createClient } from "@/lib/supabase/server";
import { buttonPrimaryCompact, buttonSecondary, surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Lesson Viewer",
};

const outlineButtonClass = `${buttonSecondary} min-h-11 px-3 text-xs`;
const solidButtonClass = `${buttonPrimaryCompact} min-h-11 px-3 text-xs`;

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
        eyebrow={lesson.subjectName}
        title="Lesson"
      />

      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 md:px-8">
        <section>
          <h2 className="break-words text-xl font-semibold leading-7 tracking-tight text-ink">
            {lesson.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            {lesson.className} · {lesson.subjectName} · {formatPublished(lesson.publishedAt)}
          </p>
        </section>

        <section className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Lesson Content
            </p>
            <div className={`${surfaceCard} p-4`}>
              {paragraphs.length === 0 ? (
                <p className="text-sm leading-6 text-ink">No description yet.</p>
              ) : (
                paragraphs.map((paragraph, index) => (
                  <p
                    key={paragraph}
                    className={
                      index === 0
                        ? "break-words text-sm leading-6 text-ink"
                        : "mt-4 break-words text-sm leading-6 text-ink"
                    }
                  >
                    {paragraph}
                  </p>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Materials
            </p>
            {lesson.materials.length === 0 ? (
              <p className={`${surfaceCard} p-3 text-sm text-ink-secondary`}>
                No materials on this lesson.
              </p>
            ) : (
              <div className="space-y-2">
                {lesson.materials.map((material) => {
                  const size =
                    material.sizeBytes === null ? null : formatBytes(material.sizeBytes);
                  const meta = [kindLabel(material.kind), size].filter(Boolean).join(" · ");
                  return (
                    <MaterialRow
                      key={material.id}
                      title={material.name}
                      meta={meta}
                      action={
                        material.externalUrl ? (
                          <a
                            className={`inline-block ${outlineButtonClass}`}
                            href={material.externalUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Watch
                          </a>
                        ) : (
                          <button className={solidButtonClass} type="button">
                            Download
                          </button>
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <PrimaryButton href="/feed">Back to Learning Feed</PrimaryButton>
      </main>
    </>
  );
}
