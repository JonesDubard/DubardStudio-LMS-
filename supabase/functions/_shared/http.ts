/** Small HTTP helpers shared by the files-upload and files-sign Edge Functions. */

import { StorageError } from "./storage.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info, x-upload-type, x-file-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** StorageError -> { error: { code, message } } with its status. Anything else -> 500. */
export function errorResponse(e: unknown): Response {
  if (e instanceof StorageError) {
    return json({ error: { code: e.code, message: e.message } }, e.status);
  }
  console.error(e);
  return json(
    { error: { code: "internal", message: "Something went wrong. Please try again." } },
    500,
  );
}

const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TokenClaims {
  tenantId: string;
  roles: string[];
}

/**
 * Reads tenant_id and app_roles from an access token's payload.
 * Only call this AFTER the token was verified (auth.getUser): it does not
 * check the signature. The claims come from the login hook in 0005.
 */
export function claimsFromToken(token: string): TokenClaims {
  let payload: Record<string, unknown> = {};
  try {
    const part = token.split(".")[1] ?? "";
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    payload = JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)),
    ));
  } catch {
    throw new StorageError("unauthenticated", 401, "Your session is not valid. Sign in again.");
  }
  const tenantId = payload.tenant_id;
  if (typeof tenantId !== "string" || !UUID_FORMAT.test(tenantId)) {
    throw new StorageError(
      "not_allowed",
      403,
      "Your account is not linked to a school. Sign out and back in.",
    );
  }
  const roles = Array.isArray(payload.app_roles)
    ? payload.app_roles.filter((r): r is string => typeof r === "string")
    : [];
  return { tenantId: tenantId.toLowerCase(), roles };
}

export function bearerToken(req: Request): string {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new StorageError("unauthenticated", 401, "Sign in to upload or open files.");
  }
  return token;
}