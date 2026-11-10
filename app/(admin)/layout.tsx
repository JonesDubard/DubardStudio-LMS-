import type { ReactNode } from "react";
import { AdminSideNav } from "@/components/admin/AdminSideNav";
import { readShellBrand } from "@/lib/branding/shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const brand = await readShellBrand();

  return (
    <div className="flex min-h-screen min-w-0 overflow-x-hidden bg-canvas text-ink">
      <AdminSideNav schoolName={brand.schoolName ?? "School"} logoUrl={brand.logoUrl} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
