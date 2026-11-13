import { describe, expect, it } from "vitest";
import { demoRequestSchema } from "../../lib/marketing/demo-request";

const valid = {
  schoolName: "Riverside Secondary",
  administratorName: "Amina Kamara",
  email: "amina@riverside.edu",
  phone: "+231 886 000 000",
  message: "We want a short pilot for two classes.",
};

describe("demoRequestSchema", () => {
  it("accepts a complete request and a blank message", () => {
    expect(demoRequestSchema.safeParse(valid).success).toBe(true);
    expect(demoRequestSchema.safeParse({ ...valid, message: "  " }).success).toBe(
      true,
    );
  });

  it("rejects missing, oversized, and badly formed fields", () => {
    expect(demoRequestSchema.safeParse({ ...valid, schoolName: " " }).success).toBe(
      false,
    );
    expect(
      demoRequestSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);
    expect(demoRequestSchema.safeParse({ ...valid, phone: "call me" }).success).toBe(
      false,
    );
    expect(
      demoRequestSchema.safeParse({ ...valid, message: "x".repeat(1001) }).success,
    ).toBe(false);
  });
});
