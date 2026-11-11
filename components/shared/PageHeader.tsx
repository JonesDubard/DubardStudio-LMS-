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
      <header className="bg-brand-primary px-4 py-6 text-white md:px-8 md:py-8">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/80">{props.eyebrow}</p>
            <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight md:text-3xl">
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
