import test from "node:test";
import assert from "node:assert/strict";
import { claimsFromToken, errorResponse } from "../_shared/http.ts";
import { StorageError } from "../_shared/storage.ts";

const SCHOOL_A = "11111111-1111-4111-8111-111111111111";
const b64url = (o: unknown) =>
  Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const token = (payload: unknown) => `${b64url({ alg: "HS256" })}.${b64url(payload)}.sig`;

test("claims: tenant and roles come from the token", () => {
  assert.deepEqual(
    claimsFromToken(token({ tenant_id: SCHOOL_A.toUpperCase(), app_roles: ["teacher", "school_admin"] })),
    { tenantId: SCHOOL_A, roles: ["teacher", "school_admin"] },
  );
});

test("claims: a token without a school is refused with a clear message", () => {
  for (const p of [{}, { tenant_id: "nope" }, { tenant_id: 5 }, { app_roles: ["platform_admin"] }]) {
    assert.throws(() => claimsFromToken(token(p)), (e: unknown) =>
      e instanceof StorageError && e.code === "not_allowed" && e.status === 403);
  }
});

test("claims: garbage is a 401", () => {
  assert.throws(() => claimsFromToken("not-a-jwt"), (e: unknown) => e instanceof StorageError && e.status === 401);
});

test("claims: roles that are not strings are dropped", () => {
  assert.deepEqual(claimsFromToken(token({ tenant_id: SCHOOL_A, app_roles: ["teacher", 7, null] })).roles, ["teacher"]);
});

test("errors: a StorageError keeps its code, message and status; anything else is a generic 500", async () => {
  const known = errorResponse(new StorageError("file_too_large", 413, "The file is 12 MB. The limit is 10 MB."));
  assert.equal(known.status, 413);
  assert.deepEqual(await known.json(), { error: { code: "file_too_large", message: "The file is 12 MB. The limit is 10 MB." } });

  const origError = console.error;
  console.error = () => {};
  try {
    const unknown = errorResponse(new Error("db password is hunter2"));
    assert.equal(unknown.status, 500);
    assert.ok(!JSON.stringify(await unknown.json()).includes("hunter2"));
  } finally {
    console.error = origError;
  }
});