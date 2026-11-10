import { redirect } from "next/navigation";

export default async function GradeEntryRedirect({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  redirect(`/teacher/assessments/${assessmentId}/submissions`);
}
