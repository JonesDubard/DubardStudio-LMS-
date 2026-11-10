import type { ReactNode } from "react";
import { BottomNav } from "@/components/student/BottomNav";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas text-ink">
      <div className="mx-auto w-full max-w-7xl md:pt-14">
        <BottomNav />
        <div className="min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-10">
          {children}
        </div>
      </div>
    </div>
  );
}
