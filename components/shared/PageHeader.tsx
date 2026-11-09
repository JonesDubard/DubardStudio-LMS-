import { BookOpen, UserRound } from "lucide-react";

type GreetingHeader = {
  variant: "greeting";
  eyebrow: string;
  title: string;
};

type SectionHeader = {
  variant: "section";
  eyebrow: string;
  title: string;
};

type PageHeaderProps = GreetingHeader | SectionHeader;

export function PageHeader(props: PageHeaderProps) {
  if (props.variant === "greeting") {
    return (
      <header className="bg-brand-primary px-4 py-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/80">{props.eyebrow}</p>
            <h1 className="mt-0.5 truncate text-2xl font-semibold tracking-tight">
              {props.title}
            </h1>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
            <UserRound size={18} strokeWidth={1.75} aria-hidden />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-line bg-surface px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-secondary">
          <BookOpen size={18} strokeWidth={1.75} aria-hidden />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-muted">{props.eyebrow}</p>
          <h1 className="truncate text-base font-semibold tracking-tight text-ink">
            {props.title}
          </h1>
        </div>
      </div>
    </header>
  );
}
