import { describe, expect, it } from "vitest";
import {
  DEFAULT_BRAND_PRIMARY,
  DEFAULT_BRAND_SECONDARY,
  brandColorOrDefault,
  brandStyleText,
  brandingColorsSchema,
} from "../../lib/branding/colors";

describe("branding colors", () => {
  it("accepts #RGB and #RRGGBB", () => {
    expect(
      brandingColorsSchema.safeParse({
        primaryColor: "#abc",
        secondaryColor: "#1E40AF",
      }).success,
    ).toBe(true);
  });

  it("rejects not-a-color", () => {
    const parsed = brandingColorsSchema.safeParse({
      primaryColor: "not-a-color",
      secondaryColor: "#F59E0B",
    });
    expect(parsed.success).toBe(false);
  });

  it("falls back and refuses to inject arbitrary CSS", () => {
    expect(brandColorOrDefault(null, DEFAULT_BRAND_PRIMARY)).toBe("#333333");
    expect(brandColorOrDefault("red; }", DEFAULT_BRAND_SECONDARY)).toBe("#666666");
    expect(brandStyleText("not-a-color", "#F59E0B")).toBe(
      ":root { --brand-primary: #333333; --brand-secondary: #F59E0B; }",
    );
  });
});
