import type { ReactNode } from "react";
import { TeacherSideNav } from "@/components/teacher/TeacherSideNav";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-0 overflow-x-hidden bg-canvas text-ink">
      <TeacherSideNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
