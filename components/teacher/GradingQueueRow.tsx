import Link from "next/link";
import { buttonPrimaryCompact } from "@/lib/ui/styles";

type GradingQueueRowProps = {
  title: string;
  className: string;
  typeLabel: string;
  pendingLabel: string;
  actionLabel: string;
  href: string;
};

export function GradingQueueRow({
  title,
  className,
  typeLabel,
  pendingLabel,
  actionLabel,
  href,
}: GradingQueueRowProps) {
  return (
    <tr>
      <td className="px-4 py-4 font-medium text-ink">{title}</td>
      <td className="px-4 py-4 text-ink-secondary">{className}</td>
      <td className="px-4 py-4">{typeLabel}</td>
      <td className="px-4 py-4">{pendingLabel}</td>
      <td className="px-4 py-4">
        <Link href={href} className={buttonPrimaryCompact}>
          {actionLabel}
        </Link>
      </td>
    </tr>
  );
}
