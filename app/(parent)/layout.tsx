import { Suspense, type ReactNode } from "react";
import { ParentNav } from "@/components/parent/ParentNav";

export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas text-ink">
      <div className="mx-auto w-full max-w-7xl md:pt-14">
        <Suspense fallback={null}>
          <ParentNav />
        </Suspense>
        <div className="min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-10">
          {children}
        </div>
      </div>
    </div>
  );
}
