import type { Metadata } from "next";
import type { ReactNode } from "react";
import { brandStyleText } from "@/lib/branding/colors";
import { readShellBrand } from "@/lib/branding/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnGrid",
  description: "White-label learning platform for Liberian schools.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const brand = await readShellBrand();

  return (
    <html lang="en">
      <body>
        <style>{brandStyleText(brand.primary, brand.secondary)}</style>
        {children}
      </body>
    </html>
  );
}
