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
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">Setup / Branding</p>
        <h1 className="mt-1 text-2xl font-semibold text-brand-primary">
          School Branding
        </h1>
        <p className="mt-1 text-sm text-[#666666]">
          Configure the visual identity students and teachers will see.
        </p>
      </header>

      <div className="p-8">
        <BrandingForm
          schoolName={brand.schoolName ?? "Pilot School #1"}
          primaryColor={brand.primary}
          secondaryColor={brand.secondary}
        />
      </div>
    </main>
  );
}
