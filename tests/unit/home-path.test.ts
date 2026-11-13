import { describe, expect, it } from "vitest";
import { homePathForRoles, homePathFromAccessToken } from "../../lib/auth/home-path";

function token(payload: Record<string, unknown>): string {
  const segment = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${segment}.signature`;
}

describe("homePathForRoles", () => {
  it("sends a school admin to the admin dashboard", () => {
    expect(homePathForRoles(["school_admin"])).toBe("/admin/dashboard");
  });

  it("sends a teacher to teacher home, a student to the feed, and a parent to parent home", () => {
    expect(homePathForRoles(["teacher"])).toBe("/teacher/home");
    expect(homePathForRoles(["student"])).toBe("/feed");
    expect(homePathForRoles(["parent"])).toBe("/parent/home");
  });

  it("prefers the platform console when that role is present", () => {
    expect(homePathForRoles(["school_admin", "platform_admin"])).toBe("/platform/dashboard");
  });

  it("reads the destination from an access token", () => {
    expect(homePathFromAccessToken(token({ app_roles: ["school_admin"] }))).toBe(
      "/admin/dashboard",
    );
    expect(homePathFromAccessToken(undefined)).toBe("/feed");
  });
});
