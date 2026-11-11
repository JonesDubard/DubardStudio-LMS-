import type { ReactNode } from "react";
import { PlatformSideNav } from "@/components/platform/PlatformSideNav";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <PlatformSideNav>{children}</PlatformSideNav>;
}
