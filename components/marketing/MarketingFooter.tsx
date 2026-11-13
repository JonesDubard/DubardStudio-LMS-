import Link from "next/link";
import { marketingNav } from "@/components/marketing/nav";
import { Logo } from "@/components/shared/Logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm leading-6 text-ink-secondary">
            TerraLearn is a white-label learning platform for Liberian schools. Each
            school gets its own subdomain and branding.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-1">
          {marketingNav.map((item) =>
            item.href.includes("#") ? (
              <a
                key={item.href}
                href={item.href}
                className="min-h-11 rounded-md py-2 text-sm text-ink-secondary transition-colors duration-200 hover:text-ink md:min-h-0"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="min-h-11 rounded-md py-2 text-sm text-ink-secondary transition-colors duration-200 hover:text-ink md:min-h-0"
              >
                {item.label}
              </Link>
            ),
          )}
          <Link
            href="/access"
            className="min-h-11 rounded-md py-2 text-sm text-ink-secondary transition-colors duration-200 hover:text-ink md:min-h-0"
          >
            School Login
          </Link>
        </nav>
      </div>
      <div className="border-t border-line-subtle">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-ink-muted">
          © {new Date().getFullYear()} TerraLearn
        </p>
      </div>
    </footer>
  );
}
