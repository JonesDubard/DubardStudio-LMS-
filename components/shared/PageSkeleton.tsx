export function PageSkeleton() {
  return (
    <div className="animate-pulse p-4 lg:p-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="h-16 rounded-lg border border-line bg-surface" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 rounded-lg border border-line bg-surface" />
        <div className="h-28 rounded-lg border border-line bg-surface" />
        <div className="h-28 rounded-lg border border-line bg-surface" />
      </div>
      <div className="mt-4 h-40 rounded-lg border border-line bg-surface" />
    </div>
  );
}
