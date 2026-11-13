import type { Metadata } from "next";
import { surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Platform Admin — Audit Log",
};

export default function AuditLogPage() {
  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1440px] p-4 lg:p-8">
        <header className="mb-8">
          <p className="text-xs font-medium text-ink-muted">Platform Admin</p>
          <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
            Audit Log
          </h1>
        </header>
        <section className={`${surfaceCard} p-6`}>
          <h2 className="font-semibold">Coming in Release 2</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            Cross-tenant audit history is not part of this release.
          </p>
        </section>
      </div>
    </main>
  );
}
