type ElevatedAccessBannerProps = {
  tenantName: string;
};

export function ElevatedAccessBanner({ tenantName }: ElevatedAccessBannerProps) {
  return (
    <div className="mb-6 border border-[#666666] bg-[#E5E5E5] px-5 py-4">
      <div className="text-sm font-semibold">
        Acting as: {tenantName} — actions are logged
      </div>
      <div className="mt-1 text-xs text-[#666666]">
        You are viewing tenant-specific data through the elevated Platform Admin
        path.
      </div>
    </div>
  );
}
