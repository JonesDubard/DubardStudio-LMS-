import type { CSSProperties, ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

/** Provisioned school defaults from the platform migration. Scoped to this site. */
const marketingBrand = {
  "--brand-primary": "#1F3A5F",
  "--brand-secondary": "#F2A900",
} as CSSProperties;

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div style={marketingBrand} className="min-h-screen overflow-x-hidden bg-canvas text-ink">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  );
}
