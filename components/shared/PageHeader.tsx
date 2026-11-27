import type { ReactNode } from "react";
import { BackLink } from "@/components/shared/BackLink";
import { ProfileSettingsLink } from "@/components/shared/ProfileSettingsLink";

type GreetingHeader = {
  variant: "greeting";
  eyebrow: string;
  title: string;
  subtitle?: string;
};

type SectionHeader = {
  variant: "section";
  eyebrow: string;
  title: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
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
            {props.subtitle ? (
              <p className="mt-1 text-sm text-ink-secondary">{props.subtitle}</p>
            ) : null}
          </div>
          <ProfileSettingsLink />
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-line bg-surface px-4 py-5 md:px-8">
      {props.backHref && props.backLabel ? (
        <BackLink href={props.backHref}>{props.backLabel}</BackLink>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-muted">{props.eyebrow}</p>
          <h1 className="mt-1 break-words text-xl font-semibold tracking-tight text-ink md:text-2xl">
            {props.title}
          </h1>
        </div>
        {props.action ? <div className="shrink-0">{props.action}</div> : null}
      </div>
    </header>
  );
}
