import type { ReactNode } from "react";
import { AdminSideNav } from "@/components/admin/AdminSideNav";
import { readShellBrand } from "@/lib/branding/shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const brand = await readShellBrand();

  return (
    <AdminSideNav schoolName={brand.schoolName ?? "School"} logoUrl={brand.logoUrl}>
      {children}
    </AdminSideNav>
  );
}
