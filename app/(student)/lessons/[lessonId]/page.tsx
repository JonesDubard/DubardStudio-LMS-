import type { Metadata } from "next";
import { MaterialRow } from "@/components/student/MaterialRow";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { getLesson } from "@/lib/stubs/get-lesson";

export const metadata: Metadata = {
  title: "Lesson Viewer",
};

const outlineButtonClass =
  "min-h-10 border border-[#333333] bg-white px-3 text-xs font-semibold text-[#333333]";

const solidButtonClass =
  "min-h-10 border border-[#333333] bg-[#333333] px-3 text-xs font-semibold text-white";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);

  return (
    <>
      <PageHeader
        variant="section"
        eyebrow={lesson.subject}
        title={lesson.headerTitle}
      />

      <main className="space-y-5 px-4 py-5">
        <section>
          <p className="text-xs font-semibold uppercase text-[#666666]">
            {lesson.weekLabel}
          </p>

          <h2 className="mt-1 text-xl font-bold leading-7">{lesson.title}</h2>

          <p className="mt-2 text-sm text-[#666666]">{lesson.meta}</p>
        </section>

        <section className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase text-[#666666]">
              {lesson.contentLabel}
            </p>

            <div className="border border-[#999999] p-4">
              {lesson.paragraphs.map((paragraph, index) => (
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
              ))}
            </div>
          </div>

          <div className="border border-[#E5E5E5] bg-[#E5E5E5] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#333333]">
                  {lesson.structureTitle}
                </p>
                <p className="mt-1 text-xs text-[#666666]">
                  {lesson.structureDetail}
                </p>
              </div>

              <StatusBadge label={lesson.structureStatus} tone="ready" />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase text-[#666666]">
              {lesson.imageLabel}
            </p>

            <div className="border border-[#999999]">
              <div className="flex h-36 items-center justify-center bg-[#E5E5E5] text-xs text-[#666666]">
                {lesson.imagePreview}
              </div>

              <div className="flex items-center justify-between gap-3 p-3">
                <span className="min-w-0 flex-1 truncate text-xs text-[#666666]">
                  {lesson.imageCaption}
                </span>

                <button
                  className={`shrink-0 ${outlineButtonClass}`}
                  type="button"
                >
                  {lesson.imageAction}
                </button>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase text-[#666666]">
              {lesson.materialsLabel}
            </p>

            <div className="space-y-2">
              {lesson.materials.map((material) => (
                <MaterialRow
                  key={material.name}
                  title={material.name}
                  meta={material.meta}
                  action={
                    <button
                      className={
                        material.tone === "solid"
                          ? solidButtonClass
                          : outlineButtonClass
                      }
                      type="button"
                    >
                      {material.actionLabel}
                    </button>
                  }
                />
              ))}
            </div>
          </div>
        </section>

        <section className="border border-[#999999] bg-[#E5E5E5] p-3">
          <p className="text-xs font-bold text-[#333333]">
            {lesson.offlineTitle}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#666666]">
            {lesson.offlineDetail}
          </p>
        </section>

        <PrimaryButton href="/feed">{lesson.backLabel}</PrimaryButton>
      </main>
    </>
  );
}
