import type { ReactNode } from "react";

type AcademicSetupStepCardProps = {
  title: string;
  description: string;
  addLabel?: string;
  children: ReactNode;
};

export function AcademicSetupStepCard({
  title,
  description,
  addLabel = "+ Add",
  children,
}: AcademicSetupStepCardProps) {
  return (
    <section className="border border-[#999999] bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-[#666666]">{description}</p>
        </div>
        <button
          type="button"
          className="border border-[#333333] px-3 py-2 text-sm"
        >
          {addLabel}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto border border-[#999999]">
        {children}
      </div>
    </section>
  );
}
