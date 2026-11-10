import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

const title = "TerraLearn | Academic Delivery for Modern Schools";
const description =
  "TerraLearn helps schools deliver academic content through a school-branded, accessible digital learning platform.";

export async function generateMetadata(): Promise<Metadata> {
  const subdomain = (await headers()).get("x-tenant-subdomain");
  if (subdomain) {
    return { title: "TerraLearn" };
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "TerraLearn",
    },
  };
}

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const subdomain = (await headers()).get("x-tenant-subdomain");
  if (subdomain) return children;
  return <MarketingShell>{children}</MarketingShell>;
}
