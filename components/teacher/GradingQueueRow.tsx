import Link from "next/link";

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
      <td className="px-4 py-4 font-medium">{title}</td>
      <td className="px-4 py-4">{className}</td>
      <td className="px-4 py-4">{typeLabel}</td>
      <td className="px-4 py-4">{pendingLabel}</td>
      <td className="px-4 py-4">
        <Link
          href={href}
          className="inline-block border border-[#333333] px-3 py-2"
        >
          {actionLabel}
        </Link>
      </td>
    </tr>
  );
}
