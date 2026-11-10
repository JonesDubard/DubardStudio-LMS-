import { describe, expect, it } from "vitest";
import {
  allowsRootMarketing,
  isRootMarketingPath,
} from "../../lib/marketing/paths";

describe("isRootMarketingPath", () => {
  it("allows the public marketing routes", () => {
    expect(isRootMarketingPath("/")).toBe(true);
    expect(isRootMarketingPath("/contact")).toBe(true);
    expect(isRootMarketingPath("/contact/")).toBe(true);
    expect(isRootMarketingPath("/access")).toBe(true);
    expect(isRootMarketingPath("/access/")).toBe(true);
  });

  it("rejects nearby and application routes", () => {
    expect(isRootMarketingPath("/login")).toBe(false);
    expect(isRootMarketingPath("/feed")).toBe(false);
    expect(isRootMarketingPath("/contacts")).toBe(false);
    expect(isRootMarketingPath("/contact/extra")).toBe(false);
    expect(isRootMarketingPath("/platform/dashboard")).toBe(false);
  });
});

describe("allowsRootMarketing", () => {
  it("allows marketing routes only when there is no tenant subdomain", () => {
    expect(allowsRootMarketing("/", null)).toBe(true);
    expect(allowsRootMarketing("/contact", undefined)).toBe(true);
    expect(allowsRootMarketing("/access", "")).toBe(true);
    expect(allowsRootMarketing("/", "pilot1")).toBe(false);
    expect(allowsRootMarketing("/contact", "notaschool")).toBe(false);
    expect(allowsRootMarketing("/feed", null)).toBe(false);
  });
});
