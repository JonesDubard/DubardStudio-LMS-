type OnboardingProgressCellProps = {
  complete: boolean;
};

export function OnboardingProgressCell({
  complete,
}: OnboardingProgressCellProps) {
  if (complete) {
    return <span>✓</span>;
  }

  return <span className="text-[#999999]">○</span>;
}
