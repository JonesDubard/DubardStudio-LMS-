import { UserRound } from "lucide-react";
import { BackLink } from "@/components/shared/BackLink";

type GreetingHeader = {
  variant: "greeting";
  eyebrow: string;
  title: string;
};

type SectionHeader = {
  variant: "section";
  eyebrow: string;
  title: string;
  backHref?: string;
  backLabel?: string;
};

type PageHeaderProps = GreetingHeader | SectionHeader;

export function PageHeader(props: PageHeaderProps) {
  if (props.variant === "greeting") {
    return (
      <header className="border-b border-line bg-surface px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1 shrink-0 rounded-full bg-brand-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {props.eyebrow}
            </p>
            <h1 className="mt-1 break-words text-xl font-semibold tracking-tight text-ink md:text-2xl">
              {props.title}
            </h1>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand-primary">
            <UserRound size={18} strokeWidth={1.75} aria-hidden />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-line bg-surface px-4 py-5 md:px-8">
      {props.backHref && props.backLabel ? (
        <BackLink href={props.backHref}>{props.backLabel}</BackLink>
      ) : null}
      <p className="text-xs font-medium text-ink-muted">{props.eyebrow}</p>
      <h1 className="mt-1 break-words text-xl font-semibold tracking-tight text-ink md:text-2xl">
        {props.title}
      </h1>
    </header>
  );
}
