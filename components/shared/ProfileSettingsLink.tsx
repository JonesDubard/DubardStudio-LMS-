import { UserRound } from "lucide-react";
import Link from "next/link";

export function ProfileSettingsLink() {
  return (
    <Link
      href="/settings"
      aria-label="Open settings"
      title="Settings"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand-primary transition-colors hover:bg-brand-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
    >
      <UserRound size={18} strokeWidth={1.75} aria-hidden />
    </Link>
  );
}
