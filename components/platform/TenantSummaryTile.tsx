type TenantSummaryTileProps = {
  label: string;
  value: string;
};

export function TenantSummaryTile({ label, value }: TenantSummaryTileProps) {
  return (
    <div className="border border-[#E5E5E5] p-5">
      <div className="text-sm text-[#666666]">{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
    </div>
  );
}
