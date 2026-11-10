"use server";

import {
  demoRequestSchema,
  recordDemoRequest,
} from "@/lib/marketing/demo-request";

export type DemoRequestState = {
  status: "idle" | "success" | "error";
  error?: string;
  fieldErrors?: Record<string, string>;
};

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function submitDemoRequest(
  _previous: DemoRequestState,
  formData: FormData,
): Promise<DemoRequestState> {
  const parsed = demoRequestSchema.safeParse({
    schoolName: text(formData.get("schoolName")),
    administratorName: text(formData.get("administratorName")),
    email: text(formData.get("email")),
    phone: text(formData.get("phone")),
    message: text(formData.get("message")),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      status: "error",
      error: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  try {
    recordDemoRequest(parsed.data);
  } catch {
    return {
      status: "error",
      error: "We could not send your request. Please try again.",
    };
  }

  return { status: "success" };
}
