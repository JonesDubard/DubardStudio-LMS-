import { describe, expect, it } from "vitest";
import { readAccessTokenClaims } from "../../lib/auth/claims";

function token(payload: Record<string, unknown>): string {
  const segment = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${segment}.signature`;
}

describe("readAccessTokenClaims", () => {
  it("reads app_roles and tenant_id from the payload", () => {
    const claims = readAccessTokenClaims(
      token({
        role: "authenticated",
        app_roles: ["student"],
        tenant_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      }),
    );

    expect(claims).toEqual({
      app_roles: ["student"],
      app_role: "student",
      tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    });
  });

  it("still reads a legacy app_role string", () => {
    expect(
      readAccessTokenClaims(
        token({
          role: "authenticated",
          app_role: "teacher",
          tenant_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
        }),
      ),
    ).toEqual({
      app_roles: ["teacher"],
      app_role: "teacher",
      tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    });
  });

  it("returns empty claims when the token is missing them or malformed", () => {
    expect(readAccessTokenClaims(token({ role: "authenticated" }))).toEqual({
      app_roles: [],
      app_role: null,
      tenantId: null,
    });
    expect(readAccessTokenClaims("not-a-jwt")).toEqual({
      app_roles: [],
      app_role: null,
      tenantId: null,
    });
  });
});
