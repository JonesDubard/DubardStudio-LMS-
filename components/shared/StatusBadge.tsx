const toneClass = {
  due: "shrink-0 border border-[#666666] bg-[#E5E5E5] px-2 py-1 text-[10px] font-bold text-[#333333]",
  dueOnLight:
    "border border-[#666666] bg-white px-2 py-1 text-[10px] font-bold text-[#333333]",
  submitted:
    "border border-[#666666] bg-[#E5E5E5] px-2 py-1 text-[10px] font-bold text-[#333333]",
  ready:
    "border border-[#999999] bg-white px-2 py-1 text-[10px] font-bold text-[#666666]",
} as const;

type StatusBadgeProps = {
  label: string;
  tone?: keyof typeof toneClass;
  className?: string;
};

export function StatusBadge({
  label,
  tone,
  className = "border border-[#999999] px-2 py-1 text-xs",
}: StatusBadgeProps) {
  return <span className={tone ? toneClass[tone] : className}>{label}</span>;
}
