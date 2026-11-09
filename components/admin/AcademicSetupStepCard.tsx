import Link from "next/link";
import type { ReactNode } from "react";
import { surfaceCard } from "@/lib/ui/styles";

type AcademicSetupStepCardProps = {
  title: string;
  description: string;
  href?: string;
  headerAction?: ReactNode;
  children: ReactNode;
};

export function AcademicSetupStepCard({
  title,
  description,
  href,
  headerAction,
  children,
}: AcademicSetupStepCardProps) {
  return (
    <section className={`${surfaceCard} p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-ink">
            {href ? (
              <Link href={href} className="underline-offset-2 hover:underline">
                {title}
              </Link>
            ) : (
              title
            )}
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">{description}</p>
        </div>
        {headerAction}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-line">{children}</div>
    </section>
  );
}
