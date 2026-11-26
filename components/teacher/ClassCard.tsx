import Link from "next/link";
import { School } from "lucide-react";
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
      className={`${surfaceCard} block p-5 hover:border-brand-border hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Class
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-ink">
            {name}
          </h3>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-secondary">
          <School size={19} strokeWidth={1.8} aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-sm text-ink">{subject}</p>
      <p className="text-sm text-ink-secondary">{studentCountLabel}</p>
    </Link>
  );
}
