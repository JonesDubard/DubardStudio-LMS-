"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SignOutButton } from "@/components/shared/SignOutButton";

export type MobileNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
};

type MobileNavBarProps = {
  title: string;
  subtitle?: string;
  renderLogo: () => ReactNode;
  items: MobileNavItem[];
};

const itemClass =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-secondary transition-colors duration-200 hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring";

const itemActiveClass =
  "flex min-h-11 w-full items-center gap-3 rounded-lg bg-brand-subtle px-3 py-2.5 text-sm font-semibold text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring";

export function MobileNavBar({ title, subtitle, renderLogo, items }: MobileNavBarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const focusable = () =>
      panel
        ? [...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")]
        : [];

    focusable()[0]?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const itemsInPanel = focusable();
      if (itemsInPanel.length === 0) return;
      const first = itemsInPanel[0];
      const last = itemsInPanel[itemsInPanel.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function closeAndFocusButton() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 md:hidden">
        <button
          ref={buttonRef}
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <X size={20} strokeWidth={1.75} aria-hidden />
          ) : (
            <Menu size={20} strokeWidth={1.75} aria-hidden />
          )}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
        {renderLogo()}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          {subtitle ? <p className="truncate text-xs text-ink-muted">{subtitle}</p> : null}
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={closeAndFocusButton}
          />
          <div
            ref={panelRef}
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 flex h-dvh w-[min(100%,20rem)] flex-col bg-surface shadow-card"
          >
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3">
              {renderLogo()}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{title}</p>
                {subtitle ? <p className="truncate text-xs text-ink-muted">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
                onClick={closeAndFocusButton}
              >
                <X size={20} strokeWidth={1.75} aria-hidden />
                <span className="sr-only">Close menu</span>
              </button>
            </div>
            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3" aria-label="Menu">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={item.active ? itemActiveClass : itemClass}
                    aria-current={item.active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={18} strokeWidth={1.75} aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="shrink-0 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <SignOutButton variant="menu" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
