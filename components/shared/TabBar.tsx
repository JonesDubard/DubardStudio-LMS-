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
    <div className="mb-6 border-b border-[#E5E5E5]">
      <nav className="flex gap-8 overflow-x-auto text-sm">
        {tabs.map((tab) => {
          const className = tab.active
            ? "border-b-2 border-[#333333] px-1 py-3 font-medium"
            : "px-1 py-3 text-[#666666]";

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
