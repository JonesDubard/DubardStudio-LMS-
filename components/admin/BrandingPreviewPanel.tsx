type BrandingPreviewPanelProps = {
  schoolName: string;
  portalLabel: string;
  feedLabel: string;
  lessonTitle: string;
  lessonSubtitle: string;
  ctaLabel: string;
  primaryColor: string;
  secondaryColor: string;
};

export function BrandingPreviewPanel({
  schoolName,
  portalLabel,
  feedLabel,
  lessonTitle,
  lessonSubtitle,
  ctaLabel,
  primaryColor,
  secondaryColor,
}: BrandingPreviewPanelProps) {
  return (
    <aside className="h-fit border border-[#999999] bg-white p-6">
      <p className="text-sm text-[#666666]">Live Preview</p>
      <h2 className="mt-1 text-lg font-semibold" style={{ color: primaryColor }}>
        Student View
      </h2>

      <div className="mt-6 border border-[#999999]">
        <div className="h-2" style={{ backgroundColor: secondaryColor }} />
        <div className="flex items-center gap-3 border-b border-[#999999] p-4">
          <div
            className="flex h-9 w-9 items-center justify-center border border-[#999999] text-white"
            style={{ backgroundColor: secondaryColor }}
          >
            /
          </div>
          <div>
            <p className="font-semibold">{schoolName}</p>
            <p className="text-xs text-[#666666]">{portalLabel}</p>
          </div>
        </div>

        <div className="p-5">
          <p className="text-sm text-[#666666]">{feedLabel}</p>

          <div
            className="mt-4 border p-4"
            style={{ borderColor: secondaryColor }}
          >
            <p className="font-semibold" style={{ color: primaryColor }}>
              {lessonTitle}
            </p>
            <p className="mt-2 text-sm text-[#666666]">{lessonSubtitle}</p>

            <button
              type="button"
              className="mt-4 px-4 py-2 text-sm text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
