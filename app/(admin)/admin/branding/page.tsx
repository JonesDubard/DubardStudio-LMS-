import type { Metadata } from "next";
import { BrandingForm } from "./_components/BrandingForm";
import { readShellBrand } from "@/lib/branding/shell";

export const metadata: Metadata = {
  title: "School Branding Setup",
};

export default async function AdminBrandingPage() {
  const brand = await readShellBrand();

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8 lg:py-6">
        <p className="text-xs font-medium text-ink-muted">Setup / Branding</p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight text-ink md:text-2xl">
          School Branding
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Configure the visual identity students and teachers will see.
        </p>
      </header>

      <div className="p-4 lg:p-8">
        <BrandingForm
          schoolName={brand.schoolName ?? "Pilot School #1"}
          primaryColor={brand.primary}
          secondaryColor={brand.secondary}
        />
      </div>
    </main>
  );
}
