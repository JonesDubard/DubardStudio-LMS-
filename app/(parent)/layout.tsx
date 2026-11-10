import { Suspense, type ReactNode } from "react";
import { ParentNav } from "@/components/parent/ParentNav";

export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-0 overflow-x-hidden bg-canvas text-ink">
      <Suspense fallback={null}>
        <ParentNav />
      </Suspense>
      <div className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
    </div>
  );
}
