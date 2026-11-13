import { surfaceCard } from "@/lib/ui/styles";

type TenantSummaryTileProps = {
  label: string;
  value: string;
};

export function TenantSummaryTile({ label, value }: TenantSummaryTileProps) {
  return (
    <div className={`${surfaceCard} p-4 hover:shadow-lift`}>
      <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</div>
    </div>
  );
}
