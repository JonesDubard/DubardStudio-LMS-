const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2";

const interactive =
  `inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold tracking-tight transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export const buttonPrimary = `${interactive} border border-transparent bg-brand-primary px-4 py-2.5 text-white hover:bg-brand-hover active:bg-brand-active`;

export const buttonPrimaryCompact = `${interactive} border border-transparent bg-brand-primary px-3 py-2 text-white hover:bg-brand-hover active:bg-brand-active`;

export const buttonSecondary = `${interactive} border border-line bg-surface px-4 py-2.5 text-ink shadow-card hover:bg-surface-muted`;

export const buttonOutline = `${interactive} border border-brand-border bg-surface px-4 py-2.5 text-brand-primary hover:bg-brand-subtle`;

export const buttonGhost = `${interactive} border border-transparent bg-transparent px-3 py-2 text-ink-secondary hover:bg-surface-muted hover:text-ink`;

export const surfaceCard =
  "rounded-lg border border-line bg-surface text-ink shadow-card";

export const surfaceMuted = "rounded-lg bg-surface-muted";

export const fieldLabel =
  "mb-1.5 block text-[13px] font-medium leading-5 text-ink";

export const fieldHelper = "mt-1.5 text-[13px] leading-5 text-ink-secondary";

export const fieldError = "mt-1.5 text-[13px] leading-5 text-danger";

export const fieldControlBase =
  "rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink shadow-card transition-colors duration-150 placeholder:text-ink-disabled hover:border-line-strong focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-ring disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-ink-disabled aria-[invalid=true]:border-danger aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger-ring";

export const fieldControl = `w-full ${fieldControlBase}`;

export const alertError =
  "rounded-lg border border-danger-border bg-danger-subtle px-3 py-2 text-sm text-danger";

export const badgeBase =
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-5";

export const navLink =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-secondary transition-colors duration-150 hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring";

export const navLinkActive =
  "flex items-center gap-3 rounded-lg bg-brand-subtle px-3 py-2.5 text-sm font-semibold text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring";
