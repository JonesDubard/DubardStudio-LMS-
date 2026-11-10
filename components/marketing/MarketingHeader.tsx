import Link from "next/link";
import { marketingNav } from "@/components/marketing/nav";
import { MarketingMenu } from "@/components/marketing/MarketingMenu";
import { Logo } from "@/components/shared/Logo";
import { buttonGhost, buttonPrimary } from "@/lib/ui/styles";

const navItem =
  "rounded-md px-2.5 py-2 text-sm text-ink-secondary transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="relative mx-auto flex min-h-14 max-w-6xl items-center gap-3 px-4 py-2">
        <Link
          href="/"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
        >
          <Logo />
        </Link>
        <nav aria-label="Primary" className="ml-4 hidden items-center md:flex">
          {marketingNav.map((item) =>
            item.href.includes("#") ? (
              <a key={item.href} href={item.href} className={navItem}>
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className={navItem}>
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="ml-auto hidden items-center gap-1 md:flex">
          <Link href="/access" className={buttonGhost}>
            School Login
          </Link>
          <Link href="/contact" className={buttonPrimary}>
            Book a Pilot
          </Link>
        </div>
        <div className="ml-auto md:hidden">
          <MarketingMenu />
        </div>
      </div>
    </header>
  );
}
