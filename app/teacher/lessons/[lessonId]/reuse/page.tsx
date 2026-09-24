import type { Metadata } from "next";
import { getLessonForReuse } from "@/lib/stubs/get-lesson-for-reuse";

export const metadata: Metadata = {
  title: "Lesson Reuse",
};

type LessonReusePageProps = {
  params: Promise<{ lessonId: string }>;
};

export default async function LessonReusePage({ params }: LessonReusePageProps) {
  const { lessonId } = await params;
  const lesson = getLessonForReuse(lessonId);

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">{lesson.eyebrow}</p>
        <div className="mt-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{lesson.title}</h1>
            <p className="mt-1 text-sm text-[#666666]">{lesson.meta}</p>
          </div>

          <button
            type="button"
            className="border border-[#999999] bg-[#E5E5E5] px-4 py-2"
          >
            More
          </button>
        </div>
      </header>

      <div className="p-8">
        <div className="max-w-4xl border border-[#999999] bg-white p-6 opacity-60">
          <p className="text-sm text-[#666666]">{lesson.publishedLabel}</p>
          <h2 className="mt-2 text-xl font-semibold">{lesson.title}</h2>

          <div className="mt-5 border border-[#E5E5E5] p-4">
            <p className="text-sm">{lesson.description}</p>
          </div>
        </div>

        <div className="fixed inset-y-0 right-0 w-full max-w-lg border-l border-[#999999] bg-white shadow-none">
          <div className="border-b border-[#999999] p-6">
            <p className="text-sm text-[#666666]">{lesson.panelEyebrow}</p>
            <h2 className="mt-1 text-xl font-semibold">{lesson.panelTitle}</h2>
            <p className="mt-2 text-sm text-[#666666]">{lesson.panelSubtitle}</p>
          </div>

          <div className="space-y-6 p-6">
            <section>
              <h3 className="font-semibold">Choose Action</h3>

              <div className="mt-4 space-y-3">
                <label className="block border border-[#333333] bg-[#E5E5E5] p-4">
                  <div className="flex gap-3">
                    <input
                      type="radio"
                      name="reuse-action"
                      defaultChecked={lesson.selectedAction === "duplicate"}
                    />
                    <div>
                      <p className="font-semibold">Duplicate Lesson</p>
                      <p className="mt-1 text-sm text-[#666666]">
                        Create a copy of this lesson for the selected term.
                      </p>
                    </div>
                  </div>
                </label>

                <label className="block border border-[#999999] p-4">
                  <div className="flex gap-3">
                    <input
                      type="radio"
                      name="reuse-action"
                      defaultChecked={
                        lesson.selectedAction === "carry-forward"
                      }
                    />
                    <div>
                      <p className="font-semibold">Carry Forward</p>
                      <p className="mt-1 text-sm text-[#666666]">
                        Carry this lesson into the next academic term.
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </section>

            <section>
              <label
                className="mb-2 block font-semibold"
                htmlFor="reuse-term"
              >
                New Term / Year
              </label>

              <select
                id="reuse-term"
                defaultValue={lesson.selectedTerm}
                className="w-full border border-[#999999] bg-white px-3 py-3"
              >
                {lesson.terms.map((term) => (
                  <option key={term.label} value={term.label}>
                    {term.label}
                  </option>
                ))}
              </select>
            </section>

            <section className="border border-[#999999] p-5">
              <p className="text-sm text-[#666666]">New draft</p>
              <p className="mt-1 font-medium">{lesson.draftTitle}</p>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#666666]">Class</p>
                  <p className="mt-1">{lesson.draftClass}</p>
                </div>

                <div>
                  <p className="text-[#666666]">Term</p>
                  <p className="mt-1">{lesson.draftTerm}</p>
                </div>
              </div>
            </section>

            <div className="flex justify-between gap-3 border-t border-[#999999] pt-5">
              <button
                type="button"
                disabled
                className="cursor-not-allowed border border-[#999999] bg-[#E5E5E5] px-5 py-3 text-[#666666]"
              >
                Review
              </button>

              <button
                type="button"
                className="border border-[#333333] bg-[#333333] px-5 py-3 text-white"
              >
                Create Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
