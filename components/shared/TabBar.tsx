import Link from "next/link";

export type TabItem = {
  label: string;
  href: string;
  active?: boolean;
};

type TabBarProps = {
  tabs: TabItem[];
};

export function TabBar({ tabs }: TabBarProps) {
  return (
    <div className="mb-6 border-b border-line">
      <nav className="flex gap-6 overflow-x-auto text-sm">
        {tabs.map((tab) => {
          const className = tab.active
            ? "border-b-2 border-brand-primary px-1 py-3 font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
            : "px-1 py-3 text-ink-secondary transition-colors duration-200 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring";

          if (tab.href === "#") {
            return (
              <span key={tab.label} className={className}>
                {tab.label}
              </span>
            );
          }

          return (
            <Link key={tab.label} href={tab.href} className={className}>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
