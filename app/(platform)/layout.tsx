import type { ReactNode } from "react";
import { PlatformSideNav } from "@/components/platform/PlatformSideNav";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white text-[#333333]">
      <PlatformSideNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
