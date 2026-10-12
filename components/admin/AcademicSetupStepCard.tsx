import Link from "next/link";
import type { ReactNode } from "react";

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
    <section className="border border-[#999999] bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">
            {href ? (
              <Link href={href} className="underline-offset-2 hover:underline">
                {title}
              </Link>
            ) : (
              title
            )}
          </h2>
          <p className="mt-1 text-sm text-[#666666]">{description}</p>
        </div>
        {headerAction}
      </div>

      <div className="mt-4 overflow-x-auto border border-[#999999]">
        {children}
      </div>
    </section>
  );
}
