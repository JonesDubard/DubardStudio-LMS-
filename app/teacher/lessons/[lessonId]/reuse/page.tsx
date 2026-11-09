import { fieldControl } from "@/lib/ui/styles";
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
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-sm text-ink-secondary">{lesson.eyebrow}</p>
        <div className="mt-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{lesson.title}</h1>
            <p className="mt-1 text-sm text-ink-secondary">{lesson.meta}</p>
          </div>

          <button
            type="button"
            className="border border-line bg-surface-muted px-4 py-2"
          >
            More
          </button>
        </div>
      </header>

      <div className="p-8">
        <div className="max-w-4xl border border-line bg-surface p-6 opacity-60">
          <p className="text-sm text-ink-secondary">{lesson.publishedLabel}</p>
          <h2 className="mt-2 text-xl font-semibold">{lesson.title}</h2>

          <div className="mt-5 border border-line-subtle p-4">
            <p className="text-sm">{lesson.description}</p>
          </div>
        </div>

        <div className="fixed inset-y-0 right-0 w-full max-w-lg border-l border-line bg-surface shadow-none">
          <div className="border-b border-line p-6">
            <p className="text-sm text-ink-secondary">{lesson.panelEyebrow}</p>
            <h2 className="mt-1 text-xl font-semibold">{lesson.panelTitle}</h2>
            <p className="mt-2 text-sm text-ink-secondary">{lesson.panelSubtitle}</p>
          </div>

          <div className="space-y-6 p-6">
            <section>
              <h3 className="font-semibold">Choose Action</h3>

              <div className="mt-4 space-y-3">
                <label className="block border border-ink bg-surface-muted p-4">
                  <div className="flex gap-3">
                    <input
                      type="radio"
                      name="reuse-action"
                      defaultChecked={lesson.selectedAction === "duplicate"}
                    />
                    <div>
                      <p className="font-semibold">Duplicate Lesson</p>
                      <p className="mt-1 text-sm text-ink-secondary">
                        Create a copy of this lesson for the selected term.
                      </p>
                    </div>
                  </div>
                </label>

                <label className="block border border-line p-4">
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
                      <p className="mt-1 text-sm text-ink-secondary">
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
                className={fieldControl}
              >
                {lesson.terms.map((term) => (
                  <option key={term.label} value={term.label}>
                    {term.label}
                  </option>
                ))}
              </select>
            </section>

            <section className="border border-line p-5">
              <p className="text-sm text-ink-secondary">New draft</p>
              <p className="mt-1 font-medium">{lesson.draftTitle}</p>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-ink-secondary">Class</p>
                  <p className="mt-1">{lesson.draftClass}</p>
                </div>

                <div>
                  <p className="text-ink-secondary">Term</p>
                  <p className="mt-1">{lesson.draftTerm}</p>
                </div>
              </div>
            </section>

            <div className="flex justify-between gap-3 border-t border-line pt-5">
              <button
                type="button"
                disabled
                className="cursor-not-allowed border border-line bg-surface-muted px-5 py-3 text-ink-secondary"
              >
                Review
              </button>

              <button
                type="button"
                className="border border-brand-primary bg-brand-primary px-5 py-3 text-white"
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
