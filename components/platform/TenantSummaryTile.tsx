type TenantSummaryTileProps = {
  label: string;
  value: string;
};

export function TenantSummaryTile({ label, value }: TenantSummaryTileProps) {
  return (
    <div className="border border-line-subtle p-5">
      <div className="text-sm text-ink-secondary">{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
    </div>
  );
}
