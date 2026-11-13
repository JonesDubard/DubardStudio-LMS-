import Link from "next/link";
import { buttonPrimary } from "@/lib/ui/styles";

const variantClass = {
  feed: `${buttonPrimary} min-h-11 w-full`,
  page: `${buttonPrimary} min-h-12 w-full`,
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
      <Link href={href} className={className}>
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
