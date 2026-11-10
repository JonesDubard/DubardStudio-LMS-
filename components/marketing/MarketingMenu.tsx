"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { marketingNav } from "@/components/marketing/nav";
import { buttonPrimary, buttonSecondary } from "@/lib/ui/styles";

export function MarketingMenu() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    function onHash() {
      setOpen(false);
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onHash);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink transition-colors duration-150 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden size={20} strokeWidth={1.75} /> : <Menu aria-hidden size={20} strokeWidth={1.75} />}
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      {open ? (
        <div
          id={menuId}
          className="absolute inset-x-0 top-full border-b border-line bg-surface px-4 py-3 shadow-card"
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {marketingNav.map((item) =>
              item.href.includes("#") ? (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex min-h-11 items-center rounded-lg px-2 text-sm text-ink transition-colors duration-150 hover:bg-surface-muted"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-11 items-center rounded-lg px-2 text-sm text-ink transition-colors duration-150 hover:bg-surface-muted"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/access" className={`${buttonSecondary} w-full`}>
              School Login
            </Link>
            <Link href="/contact" className={`${buttonPrimary} w-full`}>
              Book a Pilot
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
