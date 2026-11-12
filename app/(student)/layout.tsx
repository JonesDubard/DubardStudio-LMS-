import type { ReactNode } from "react";
import { BottomNav } from "@/components/student/BottomNav";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh min-w-0 overflow-hidden bg-canvas text-ink">
      <BottomNav />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
    </div>
  );
}
