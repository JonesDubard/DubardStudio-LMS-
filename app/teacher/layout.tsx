import type { ReactNode } from "react";
import { TeacherSideNav } from "@/components/teacher/TeacherSideNav";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#E5E5E5] text-[#333333]">
      <TeacherSideNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
