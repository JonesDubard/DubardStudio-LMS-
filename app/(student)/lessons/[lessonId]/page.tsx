import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MaterialRow } from "@/components/student/MaterialRow";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { getLessonDetails } from "@/lib/queries/student";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Lesson Viewer",
};

const outlineButtonClass =
  "min-h-10 border border-[#333333] bg-white px-3 text-xs font-semibold text-[#333333]";

const solidButtonClass =
  "min-h-10 border border-brand-primary bg-brand-primary px-3 text-xs font-semibold text-white";

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

      <main className="space-y-5 px-4 py-5">
        <section>
          <h2 className="text-xl font-bold leading-7">{lesson.title}</h2>
          <p className="mt-2 text-sm text-[#666666]">
            {lesson.className} · {lesson.subjectName} · {formatPublished(lesson.publishedAt)}
          </p>
        </section>

        <section className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase text-[#666666]">
              Lesson Content
            </p>
            <div className="border border-[#999999] p-4">
              {paragraphs.length === 0 ? (
                <p className="text-sm leading-6 text-[#333333]">No description yet.</p>
              ) : (
                paragraphs.map((paragraph, index) => (
                  <p
                    key={paragraph}
                    className={
                      index === 0
                        ? "text-sm leading-6 text-[#333333]"
                        : "mt-4 text-sm leading-6 text-[#333333]"
                    }
                  >
                    {paragraph}
                  </p>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase text-[#666666]">
              Materials
            </p>
            {lesson.materials.length === 0 ? (
              <p className="border border-[#999999] p-3 text-sm text-[#666666]">
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
