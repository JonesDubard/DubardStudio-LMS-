import type { ReactNode } from "react";
import { TeacherSideNav } from "@/components/teacher/TeacherSideNav";
import { createClient } from "@/lib/supabase/server";

async function teacherFullName(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`auth: ${error.message}`);
  if (!data.user) return "";

  const result = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.user.id)
    .maybeSingle<{ full_name: string | null }>();
  if (result.error) throw new Error(`profiles: ${result.error.message}`);
  return result.data?.full_name?.trim() ?? "";
}

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const teacherName = await teacherFullName();

  return (
    <div className="flex min-h-screen min-w-0 overflow-x-hidden bg-canvas text-ink">
      <TeacherSideNav teacherName={teacherName} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
