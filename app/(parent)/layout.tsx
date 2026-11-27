import { Suspense, type ReactNode } from "react";
import { OfflineIndicator } from "@/components/shared/OfflineIndicator";
import { ParentNav } from "@/components/parent/ParentNav";
import { readShellBrand } from "@/lib/branding/shell";

export default async function ParentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const brand = await readShellBrand();

  return (
    <div className="flex h-dvh min-w-0 overflow-hidden bg-canvas text-ink">
      <Suspense fallback={null}>
        <ParentNav
          schoolName={brand.schoolName ?? "School"}
          logoUrl={brand.logoUrl}
        />
      </Suspense>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <OfflineIndicator />
        {children}
      </div>
    </div>
  );
}
