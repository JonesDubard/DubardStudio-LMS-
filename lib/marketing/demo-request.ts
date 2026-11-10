import { z } from "zod";

export const demoRequestSchema = z.object({
  schoolName: z
    .string()
    .trim()
    .min(2, "Enter your school name.")
    .max(120, "School name must be 120 characters or fewer."),
  administratorName: z
    .string()
    .trim()
    .min(2, "Enter the administrator's name.")
    .max(120, "Name must be 120 characters or fewer."),
  email: z
    .string()
    .trim()
    .min(1, "Enter an email address.")
    .max(254, "Email must be 254 characters or fewer.")
    .email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number.")
    .max(30, "Phone number must be 30 characters or fewer.")
    .regex(
      /^[0-9+().\-\s]+$/,
      "Use digits, spaces, and a country code.",
    ),
  message: z
    .string()
    .trim()
    .max(1000, "Keep the message under 1000 characters."),
});

export type DemoRequest = z.infer<typeof demoRequestSchema>;

/**
 * Temporary sink for pilot requests. Swap this for an email provider or CRM
 * later. Development logs the request. Production does not log or store it.
 */
export function recordDemoRequest(request: DemoRequest): void {
  if (process.env.NODE_ENV !== "development") return;
  console.info("[demo-request]", request);
}
