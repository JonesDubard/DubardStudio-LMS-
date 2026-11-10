import type { AdminLessonView } from "@/lib/queries/admin-content";

function paragraphs(description: string | null): string[] {
  return (description ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function LessonReadOnly({ lesson }: { lesson: AdminLessonView }) {
  const blocks = paragraphs(lesson.description);
  return (
    <div className="space-y-8">
      <p className="text-sm leading-6 text-ink-secondary">
        {lesson.className} · {lesson.subjectName} · {lesson.status}
      </p>
      <article className="max-w-prose">
        {blocks.length === 0 ? (
          <p className="text-base leading-7 text-ink-secondary">No description yet.</p>
        ) : (
          blocks.map((paragraph) => (
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
          <ul className="divide-y divide-line border border-line">
            {lesson.materials.map((material) => (
              <li key={material.id} className="px-4 py-3 text-sm font-medium">
                {material.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
