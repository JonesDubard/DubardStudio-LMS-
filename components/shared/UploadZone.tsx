type UploadZoneProps = {
  title: string;
  description: string;
  buttonLabel: string;
  variant?: "centered" | "inline";
};

export function UploadZone({
  title,
  description,
  buttonLabel,
  variant = "centered",
}: UploadZoneProps) {
  if (variant === "inline") {
    return (
      <div className="border border-dashed border-[#999999] bg-[#E5E5E5] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-sm text-[#666666]">{description}</p>
          </div>
          <button
            type="button"
            className="border border-[#999999] bg-white px-4 py-2"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-dashed border-[#999999] bg-[#E5E5E5] p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center border border-[#999999] text-[#666666]">
        /
      </div>
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm text-[#666666]">{description}</p>
      <button
        type="button"
        className="mt-4 border border-[#999999] bg-white px-4 py-2"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
