import type { ReactNode } from "react";
import { surfaceCard } from "@/lib/ui/styles";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-ink">
      <div className={`w-full max-w-sm p-6 ${surfaceCard}`}>{children}</div>
    </div>
  );
}
