import { redirect } from "next/navigation";

export default function AssignmentSubmissionsRedirect() {
  redirect("/teacher/grading");
}
