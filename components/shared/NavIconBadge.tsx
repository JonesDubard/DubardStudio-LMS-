import type { LucideIcon } from "lucide-react";

type NavIconBadgeProps = {
  icon: LucideIcon;
  active: boolean;
};

export function NavIconBadge({ icon: Icon, active }: NavIconBadgeProps) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
        active
          ? "bg-brand-primary text-white"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden />
    </span>
  );
}
