import type { ReactNode } from "react";
import { BottomNav } from "@/components/student/BottomNav";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto min-h-screen w-full max-w-[390px] bg-canvas pb-20">
        {children}
        <BottomNav />
      </div>
    </div>
  );
}
