import type { ReactNode } from "react";
import { AdminSideNav } from "@/components/admin/AdminSideNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <AdminSideNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
