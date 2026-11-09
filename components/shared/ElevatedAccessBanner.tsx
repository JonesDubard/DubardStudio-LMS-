type ElevatedAccessBannerProps = {
  tenantName: string;
};

export function ElevatedAccessBanner({ tenantName }: ElevatedAccessBannerProps) {
  return (
    <div className="mb-6 rounded-lg border border-warning-border bg-warning-subtle px-5 py-4">
      <div className="text-sm font-semibold text-warning">
        Acting as: {tenantName} — actions are logged
      </div>
      <div className="mt-1 text-xs text-ink-secondary">
        You are viewing tenant-specific data through the elevated Platform Admin
        path.
      </div>
    </div>
  );
}
