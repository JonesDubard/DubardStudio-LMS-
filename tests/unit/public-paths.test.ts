import { describe, expect, it } from "vitest";
import { isPublicPath } from "../../lib/auth/public-paths";

describe("isPublicPath", () => {
  it("allows the auth pages and the health check", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/login/")).toBe(true);
    expect(isPublicPath("/invite/abc")).toBe(true);
    expect(isPublicPath("/reset")).toBe(true);
    expect(isPublicPath("/reset/confirm")).toBe(true);
    expect(isPublicPath("/api/health")).toBe(true);
    expect(isPublicPath("/manifest.webmanifest")).toBe(true);
    expect(isPublicPath("/manifest.json")).toBe(true);
    expect(isPublicPath("/sw.js")).toBe(true);
    expect(isPublicPath("/sw.js.map")).toBe(true);
    expect(isPublicPath("/swe-worker-development.js")).toBe(true);
    expect(isPublicPath("/offline.html")).toBe(true);
    expect(isPublicPath("/icon.png")).toBe(true);
    expect(isPublicPath("/apple-icon.png")).toBe(true);
    expect(isPublicPath("/logo.svg")).toBe(true);
    expect(isPublicPath("/favicon.ico")).toBe(true);
    expect(isPublicPath("/_next/static/chunk.js")).toBe(true);
  });

  it("requires a session for persona routes", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/feed")).toBe(false);
    expect(isPublicPath("/teacher/home")).toBe(false);
    expect(isPublicPath("/admin/dashboard")).toBe(false);
    expect(isPublicPath("/platform/dashboard")).toBe(false);
    expect(isPublicPath("/resetting")).toBe(false);
  });
});
