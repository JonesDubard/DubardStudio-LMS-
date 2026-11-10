type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-sans text-base font-bold tracking-tight text-ink ${className}`.trim()}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="h-7 w-7 shrink-0"
      >
        <rect x="3" y="3" width="12" height="12" rx="2" fill="#1F3A5F" />
        <rect
          x="17"
          y="3"
          width="12"
          height="12"
          rx="2"
          stroke="#1F3A5F"
          strokeWidth="2"
        />
        <rect
          x="3"
          y="17"
          width="12"
          height="12"
          rx="2"
          stroke="#1F3A5F"
          strokeWidth="2"
        />
        <rect x="17" y="17" width="12" height="12" rx="2" fill="#1F3A5F" />
      </svg>
      LearnGrid
    </span>
  );
}
