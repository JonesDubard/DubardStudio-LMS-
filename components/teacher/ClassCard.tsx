import { surfaceCard } from "@/lib/ui/styles";

type ClassCardProps = {
  name: string;
  subject: string;
  studentCountLabel: string;
};

export function ClassCard({ name, subject, studentCountLabel }: ClassCardProps) {
  return (
    <div className={`${surfaceCard} p-5`}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Class</p>
      <h3 className="mt-1 text-base font-semibold tracking-tight text-ink">{name}</h3>
      <p className="mt-3 text-sm text-ink">{subject}</p>
      <p className="text-sm text-ink-secondary">{studentCountLabel}</p>
    </div>
  );
}
