type LogoProps = {
  className?: string;
  tone?: "default" | "inverse";
};

export function Logo({ className = "", tone = "default" }: LogoProps) {
  const mark = tone === "inverse" ? "#FFFFFF" : "#172B4D";
  const text = tone === "inverse" ? "text-white" : "text-ink";

  return (
    <span
      className={`inline-flex items-center gap-2 font-sans text-base font-bold tracking-tight ${text} ${className}`.trim()}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="h-7 w-7 shrink-0"
      >
        <rect x="3" y="3" width="12" height="12" rx="2" fill={mark} />
        <rect x="17" y="3" width="12" height="12" rx="2" stroke={mark} strokeWidth="2" />
        <rect x="3" y="17" width="12" height="12" rx="2" stroke={mark} strokeWidth="2" />
        <rect x="17" y="17" width="12" height="12" rx="2" fill={mark} />
      </svg>
      TerraLearn
    </span>
  );
}
