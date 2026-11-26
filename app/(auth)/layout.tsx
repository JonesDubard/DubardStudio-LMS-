import type { ReactNode } from "react";
import { Logo } from "@/components/shared/Logo";
import { readShellBrand } from "@/lib/branding/shell";
import { surfaceCard } from "@/lib/ui/styles";

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
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10 text-ink">
      <div className="w-full max-w-sm">
        <div className={`p-6 sm:p-8 ${surfaceCard}`}>
          <div className="mb-6 flex min-h-12 items-center justify-center">
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
            className="font-medium text-ink-secondary underline-offset-2 hover:underline"
          >
            TerraLearn
          </a>
        </footer>
      </div>
    </main>
  );
}
