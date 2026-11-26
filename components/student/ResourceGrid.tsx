import { Download, FileText } from "lucide-react";
import { Card } from "@/components/shared/Card";
import type { LibraryResource } from "@/lib/library/resources";
import { buttonSecondary } from "@/lib/ui/styles";

export type { LibraryResource } from "@/lib/library/resources";

export function ResourceGrid({
  resources,
}: {
  resources: LibraryResource[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => (
        <Card key={resource.id} className="p-4">
          <article className="flex h-full flex-col">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-subtle text-brand-primary">
              <FileText size={18} strokeWidth={1.75} aria-hidden />
            </div>
            <h3 className="mt-4 break-words text-sm font-semibold tracking-tight text-ink">
              {resource.title}
            </h3>
            <p className="mt-1 text-sm text-ink-secondary">{resource.subject}</p>
            <div className="mt-5">
              {resource.downloadUrl ? (
                <a
                  href={resource.downloadUrl}
                  download
                  className={`${buttonSecondary} w-full`}
                >
                  <Download size={16} aria-hidden />
                  Download
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className={`${buttonSecondary} w-full`}
                  aria-label={`Download ${resource.title} unavailable in preview`}
                >
                  <Download size={16} aria-hidden />
                  Download
                </button>
              )}
            </div>
          </article>
        </Card>
      ))}
    </div>
  );
}
