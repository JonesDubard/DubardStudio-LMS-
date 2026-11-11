import type { ReactNode } from "react";
import { TeacherSideNav } from "@/components/teacher/TeacherSideNav";
import { readShellBrand } from "@/lib/branding/shell";
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
  const [teacherName, brand] = await Promise.all([teacherFullName(), readShellBrand()]);

  return (
    <TeacherSideNav teacherName={teacherName} logoUrl={brand.logoUrl}>
      {children}
    </TeacherSideNav>
  );
}
