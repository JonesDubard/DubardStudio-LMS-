import type { ReactNode } from "react";
import { BottomNav } from "@/components/student/BottomNav";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#E5E5E5] text-[#333333]">
      <div className="mx-auto min-h-screen w-full max-w-[390px] bg-white pb-20">
        {children}
        <BottomNav />
      </div>
    </div>
  );
}
