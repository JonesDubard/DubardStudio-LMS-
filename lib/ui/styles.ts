const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2";

const interactive =
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold tracking-tight transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px ${focusRing}`;

export const buttonPrimary = `${interactive} border border-transparent bg-brand-primary px-4 py-2.5 text-white shadow-card hover:bg-brand-hover hover:shadow-lift active:bg-brand-active`;

export const buttonPrimaryCompact = `${interactive} border border-transparent bg-brand-primary px-3 py-2 text-white shadow-card hover:bg-brand-hover hover:shadow-lift active:bg-brand-active`;

export const buttonSecondary = `${interactive} border border-line bg-surface px-4 py-2.5 text-ink shadow-card hover:border-line-strong hover:bg-surface-muted`;

export const buttonOutline = `${interactive} border border-brand-border bg-surface px-4 py-2.5 text-brand-primary hover:bg-brand-subtle`;

export const buttonGhost = `${interactive} border border-transparent bg-transparent px-3 py-2 text-ink-secondary hover:bg-surface-muted hover:text-ink`;

export const buttonProduct = `${interactive} border border-transparent bg-product-blue px-4 py-2.5 text-white shadow-card hover:bg-product-navy`;

export const surfaceCard =
  "rounded-lg border border-line bg-surface text-ink shadow-card transition-[border-color,box-shadow] duration-200";

export const surfaceMuted = "rounded-lg bg-surface-muted";

export const fieldLabel =
  "mb-1.5 block text-[13px] font-medium leading-5 text-ink";

export const fieldHelper = "mt-1.5 text-[13px] leading-5 text-ink-secondary";

export const fieldError = "mt-1.5 text-[13px] leading-5 text-danger";

export const fieldControlBase =
  "rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink shadow-card transition-[border-color,box-shadow] duration-200 placeholder:text-ink-disabled hover:border-line-strong focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-ring disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-ink-disabled aria-[invalid=true]:border-danger aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger-ring";

export const fieldControl = `w-full ${fieldControlBase}`;

export const alertError =
  "rounded-lg border border-danger-border bg-danger-subtle px-3 py-2 text-sm text-danger";

export const badgeBase =
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-5";

export const navLink =
  "flex min-h-11 min-w-11 items-center justify-center gap-3 rounded-lg px-2 py-2.5 text-sm text-ink-secondary transition-[color,background-color] duration-200 hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring lg:justify-start lg:px-3";

export const navLinkActive =
  "flex min-h-11 min-w-11 items-center justify-center gap-3 rounded-lg bg-brand-subtle px-2 py-2.5 text-sm font-semibold text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring lg:justify-start lg:px-3";

export const navLabel = "sr-only lg:not-sr-only";

export const sideNavAside =
  "sticky top-0 flex h-screen w-20 shrink-0 flex-col border-r border-line bg-surface px-2 py-4 lg:w-64 lg:px-4 lg:py-5";

/** Desktop rail inside a fixed-height shell. Hidden below the md breakpoint. */
export const desktopSideNav =
  "hidden h-full w-20 shrink-0 flex-col border-r border-line bg-surface px-2 py-4 md:flex lg:w-64 lg:px-4 lg:py-5";
