import Link from "next/link";

const variantClass = {
  feed: "min-h-11 w-full border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-semibold text-white",
  page: "min-h-12 w-full border border-brand-primary bg-brand-primary px-4 py-3 text-sm font-bold text-white",
} as const;

type PrimaryButtonProps = {
  children: string;
  variant?: keyof typeof variantClass;
  href?: string;
};

export function PrimaryButton({
  children,
  variant = "page",
  href,
}: PrimaryButtonProps) {
  const className = variantClass[variant];

  if (href) {
    return (
      <Link href={href} className={`block text-center ${className}`}>
        {children}
      </Link>
    );
  }

  return (
    <button className={className} type="button">
      {children}
    </button>
  );
}
