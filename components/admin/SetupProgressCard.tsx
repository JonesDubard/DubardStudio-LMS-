export type SetupProgressItem = {
  id: string;
  title: string;
  description: string;
  complete: boolean;
};

type SetupProgressCardProps = {
  title: string;
  description: string;
  progressLabel: string;
  items: SetupProgressItem[];
};

export function SetupProgressCard({
  title,
  description,
  progressLabel,
  items,
}: SetupProgressCardProps) {
  return (
    <section className="border border-[#999999] bg-white p-6">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-[#666666]">{description}</p>
        </div>

        <span className="border border-[#999999] px-3 py-2 text-sm">
          {progressLabel}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={
              item.complete
                ? "border border-[#999999] bg-[#E5E5E5] p-4"
                : "border border-[#999999] p-4"
            }
          >
            <div className="flex justify-between gap-3">
              <span className="font-medium">{item.title}</span>
              <span className="text-sm">{item.complete ? "✓" : "○"}</span>
            </div>
            <p className="mt-2 text-sm text-[#666666]">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
