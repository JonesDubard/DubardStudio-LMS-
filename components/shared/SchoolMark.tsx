import { School } from "lucide-react";

export function SchoolMark({ src }: { src?: string | null }) {
  if (!src) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-subtle text-brand-primary">
        <School size={18} strokeWidth={1.75} aria-hidden />
      </div>
    );
  }

  return (
    // Signed storage URLs may point at a local Supabase host, which next/image cannot load.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-10 w-10 rounded-lg object-contain" />
  );
}
