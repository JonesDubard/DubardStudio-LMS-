import { afterEach, describe, expect, it } from "vitest";
import { resolveTenantSubdomain } from "../../lib/tenant/resolve";

describe("resolveTenantSubdomain", () => {
  const original = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    } else {
      process.env.NEXT_PUBLIC_ROOT_DOMAIN = original;
    }
  });

  it("returns null for the configured root domain", () => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = "ourlms.com";
    expect(resolveTenantSubdomain("ourlms.com")).toBeNull();
    expect(resolveTenantSubdomain("ourlms.com:3000")).toBeNull();
  });

  it("treats www as the root site", () => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = "ourlms.com";
    expect(resolveTenantSubdomain("www.ourlms.com")).toBeNull();
    expect(resolveTenantSubdomain("www.localhost")).toBeNull();
  });

  it("returns the single label in front of the root domain", () => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = "ourlms.com";
    expect(resolveTenantSubdomain("pilotschool.ourlms.com")).toBe("pilotschool");
    expect(resolveTenantSubdomain("PILOTSCHOOL.ourlms.com")).toBe("pilotschool");
  });

  it("resolves a localhost subdomain for local development", () => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = "ourlms.com";
    expect(resolveTenantSubdomain("localhost")).toBeNull();
    expect(resolveTenantSubdomain("pilotschool.localhost")).toBe("pilotschool");
    expect(resolveTenantSubdomain("pilotschool.localhost:3000")).toBe(
      "pilotschool",
    );
  });

  it("returns null when the host is not a single-label subdomain", () => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = "ourlms.com";
    expect(resolveTenantSubdomain("a.b.ourlms.com")).toBeNull();
    expect(resolveTenantSubdomain("example.com")).toBeNull();
    expect(resolveTenantSubdomain("")).toBeNull();
  });
});
