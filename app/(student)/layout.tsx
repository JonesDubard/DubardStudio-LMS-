import type { ReactNode } from "react";
import { BottomNav } from "@/components/student/BottomNav";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-0 overflow-x-hidden bg-canvas text-ink">
      <BottomNav />
      <div className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
    </div>
  );
}
