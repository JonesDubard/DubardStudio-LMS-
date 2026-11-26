"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buttonGhost, buttonOutline, navLabel, navLink } from "@/lib/ui/styles";

type SignOutButtonProps = {
  /** Sidebar control hides the words until the nav is wide. */
  variant?: "nav" | "ghost" | "menu";
  label?: string;
  /**
   * "local" ends this browser's session only (its refresh token is
   * * revoked). "global" ends every session of this account on every device.
   */
  scope?: "local" | "global";
};

export function SignOutButton({
  variant = "nav",
  label = "Sign out",
  scope = "local",
}: SignOutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = pending ? "Signing out..." : label;

  async function onClick() {
    setError(null);
    setPending(true);
    if ("caches" in window) {
      try {
        await caches.delete("pdf-cache");
      } catch (cacheError) {
        console.error("Could not clear the offline PDF cache.", cacheError);
        setError("Offline PDFs could not be cleared. Sign-out was stopped.");
        setPending(false);
        return;
      }
    }

    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut({ scope });
    if (signOutError) {
      setError(signOutError.message);
      setPending(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  const className =
    variant === "nav"
      ? `${navLink} w-full disabled:cursor-not-allowed disabled:opacity-50`
      : variant === "menu"
        ? `${buttonOutline} w-full`
        : buttonGhost;

  return (
    <div className={variant === "ghost" ? undefined : "w-full"}>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={pending}
        className={className}
      >
        <LogOut size={18} strokeWidth={1.75} aria-hidden />
        <span className={variant === "nav" ? navLabel : undefined}>{text}</span>
      </button>
      {error ? (
        <p role="alert" className="px-2 pt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
