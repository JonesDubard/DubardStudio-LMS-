import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

const title = "LearnGrid | Academic Delivery for Modern Schools";
const description =
  "LearnGrid helps schools deliver academic content through a school-branded, accessible digital learning platform.";

export async function generateMetadata(): Promise<Metadata> {
  const subdomain = (await headers()).get("x-tenant-subdomain");
  if (subdomain) {
    return { title: "LearnGrid" };
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "LearnGrid",
    },
  };
}

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const subdomain = (await headers()).get("x-tenant-subdomain");
  if (subdomain) return children;
  return <MarketingShell>{children}</MarketingShell>;
}
