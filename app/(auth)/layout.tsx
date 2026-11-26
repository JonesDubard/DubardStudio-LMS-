import type { ReactNode } from "react";
import { Logo } from "@/components/shared/Logo";
import { readShellBrand } from "@/lib/branding/shell";

function schoolInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

function marketingSiteUrl(): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().replace(/\/+$/, "");
  if (!root) return "https://terralearn.space";
  if (/^https?:\/\//i.test(root)) return root;
  return `${root.includes("localhost") ? "http" : "https"}://${root}`;
}

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const brand = await readShellBrand();

  return (
    <main
      className="flex min-h-dvh w-full min-w-0 items-center justify-center overflow-x-hidden bg-slate-50 px-4 py-10 text-ink"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in srgb, var(--brand-primary) 5%, transparent), transparent 100%)",
      }}
    >
      <div className="w-full min-w-0 max-w-md">
        <div className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-10">
          <div className="mb-8 flex h-20 items-center justify-center">
            {!brand.schoolName ? (
              <Logo />
            ) : brand.schoolLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.schoolLogoUrl}
                alt={`${brand.schoolName} logo`}
                className="max-h-16 max-w-48 object-contain"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary text-lg font-semibold text-white">
                {schoolInitials(brand.schoolName)}
              </span>
            )}
          </div>
          {children}
        </div>
        <footer className="mt-4 text-center text-xs text-ink-muted">
          Powered by{" "}
          <a
            href={marketingSiteUrl()}
            className="font-medium text-slate-500 underline-offset-2 transition-colors hover:text-brand-primary hover:underline"
          >
            TerraLearn
          </a>
        </footer>
      </div>
    </main>
  );
}
