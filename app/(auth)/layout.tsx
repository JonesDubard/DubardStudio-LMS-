import type { ReactNode } from "react";
import { Logo } from "@/components/shared/Logo";
import { surfaceCard } from "@/lib/ui/styles";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-canvas text-ink lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-product-navy px-12 py-12 text-white lg:flex">
        <Logo tone="inverse" />
        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
            Academic delivery
          </p>
          <p className="mt-4 text-3xl font-semibold tracking-tight">
            Your school&apos;s academic work, in one place.
          </p>
          <p className="mt-4 text-base leading-7 text-white/75">
            Teachers share lessons and assignments. Students open them. School leaders
            keep the year, the people, and the work together.
          </p>
        </div>
        <p className="text-sm text-white/60">Built for schools that teach on the connection they have.</p>
      </aside>
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <div className={`p-6 sm:p-8 ${surfaceCard}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
