import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { DevServiceWorkerReset } from "@/components/shared/DevServiceWorkerReset";
import { brandStyleText } from "@/lib/branding/colors";
import { readShellBrand } from "@/lib/branding/shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LearnGrid",
  description: "White-label learning platform for Liberian schools.",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const brand = await readShellBrand();

  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body suppressHydrationWarning>
        {process.env.NODE_ENV === "development" ? <DevServiceWorkerReset /> : null}
        <style>{brandStyleText(brand.primary, brand.secondary)}</style>
        {children}
      </body>
    </html>
  );
}
