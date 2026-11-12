import { StatusBadge } from "@/components/shared/StatusBadge";
import { surfaceCard } from "@/lib/ui/styles";

export function ProductComposition() {
  return (
    <figure className="relative mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none">
      <figcaption className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
        Example of the TerraLearn workspace
      </figcaption>
      <div className="relative grid gap-3 lg:block lg:min-h-[28rem]">
        <article
          className={`${surfaceCard} p-4 motion-float lg:absolute lg:right-0 lg:top-8 lg:w-[78%]`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Student</p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-ink">To hand in</h3>
          <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-line bg-canvas p-3">
            <div>
              <p className="text-sm font-semibold text-ink">Fractions practice</p>
              <p className="mt-1 text-xs text-ink-secondary">Mathematics · Due this week</p>
            </div>
            <StatusBadge label="Due" tone="due" />
          </div>
        </article>
        <article className={`${surfaceCard} p-4 lg:absolute lg:left-0 lg:top-36 lg:w-[70%]`}>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Lesson</p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-ink">
            Introduction to fractions
          </h3>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            A published lesson students open from their feed, with the class and subject
            beside the title.
          </p>
        </article>
        <article
          className={`${surfaceCard} p-4 lg:absolute lg:bottom-0 lg:right-4 lg:w-[64%]`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Teacher</p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-ink">Grade 5 · Mathematics</h3>
          <p className="mt-2 text-sm text-ink-secondary">Create a lesson or open one to grade.</p>
        </article>
      </div>
    </figure>
  );
}
