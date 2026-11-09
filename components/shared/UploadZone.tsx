import { Upload } from "lucide-react";
import { buttonSecondary } from "@/lib/ui/styles";

type UploadZoneProps = {
  title: string;
  description: string;
  buttonLabel: string;
  variant?: "centered" | "inline";
  note?: string;
};

export function UploadZone({
  title,
  description,
  buttonLabel,
  variant = "centered",
  note,
}: UploadZoneProps) {
  const button = (
    <button type="button" disabled={Boolean(note)} className={buttonSecondary}>
      {buttonLabel}
    </button>
  );

  if (variant === "inline") {
    return (
      <div className="rounded-lg border border-dashed border-line-strong bg-surface-muted p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-ink">{title}</p>
            <p className="mt-1 text-sm text-ink-secondary">{description}</p>
            {note ? <p className="mt-2 text-sm text-ink-muted">{note}</p> : null}
          </div>
          {button}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-surface-muted p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-muted shadow-card">
        <Upload size={20} strokeWidth={1.75} aria-hidden />
      </div>
      <p className="mt-3 font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-secondary">{description}</p>
      {note ? <p className="mt-2 text-sm text-ink-muted">{note}</p> : null}
      <div className="mt-4 flex justify-center">{button}</div>
    </div>
  );
}
