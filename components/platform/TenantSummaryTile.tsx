import { surfaceCard } from "@/lib/ui/styles";

type TenantSummaryTileProps = {
  label: string;
  value: string;
};

export function TenantSummaryTile({ label, value }: TenantSummaryTileProps) {
  return (
    <div className={`${surfaceCard} p-5`}>
      <div className="text-sm text-ink-secondary">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</div>
    </div>
  );
}
