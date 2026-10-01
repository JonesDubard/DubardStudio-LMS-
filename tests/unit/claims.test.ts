import { describe, expect, it } from "vitest";
import { readAccessTokenClaims } from "../../lib/auth/claims";

function token(payload: Record<string, unknown>): string {
  const segment = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${segment}.signature`;
}

describe("readAccessTokenClaims", () => {
  it("reads app_role and tenant_id from the payload", () => {
    const claims = readAccessTokenClaims(
      token({
        role: "authenticated",
        app_role: "student",
        tenant_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      }),
    );

    expect(claims).toEqual({
      app_role: "student",
      tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    });
  });

  it("returns nulls when the claims are missing or the token is malformed", () => {
    expect(readAccessTokenClaims(token({ role: "authenticated" }))).toEqual({
      app_role: null,
      tenantId: null,
    });
    expect(readAccessTokenClaims("not-a-jwt")).toEqual({
      app_role: null,
      tenantId: null,
    });
  });
});
