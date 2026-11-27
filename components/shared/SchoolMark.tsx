function schoolInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const firstWord = words.find((word) => !/\d/.test(word));
  const number = words.find((word) => /\d/.test(word))?.match(/\d+/)?.[0];
  if (firstWord && number) {
    return `${firstWord.charAt(0)}${number}`.toUpperCase();
  }

  const initials = words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
  return initials || name.trim().slice(0, 2).toUpperCase() || "S";
}

export function SchoolMark({
  src,
  schoolName = "School",
}: {
  src?: string | null;
  schoolName?: string;
}) {
  if (!src) {
    return (
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-xs font-semibold text-white"
        role="img"
        aria-label={`${schoolName} initials`}
      >
        {schoolInitials(schoolName)}
      </div>
    );
  }

  return (
    // Signed storage URLs may point at a local Supabase host, which next/image cannot load.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-10 w-10 rounded-lg object-contain" />
  );
}
