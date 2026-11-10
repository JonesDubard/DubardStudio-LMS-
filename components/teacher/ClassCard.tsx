import Link from "next/link";
import { surfaceCard } from "@/lib/ui/styles";

type ClassCardProps = {
  name: string;
  subject: string;
  studentCountLabel: string;
  href: string;
};

export function ClassCard({ name, subject, studentCountLabel, href }: ClassCardProps) {
  return (
    <Link
      href={href}
      className={`${surfaceCard} block p-5 transition-colors duration-150 hover:border-brand-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring motion-reduce:transition-none`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Class</p>
      <h3 className="mt-1 text-base font-semibold tracking-tight text-ink">{name}</h3>
      <p className="mt-3 text-sm text-ink">{subject}</p>
      <p className="text-sm text-ink-secondary">{studentCountLabel}</p>
    </Link>
  );
}
