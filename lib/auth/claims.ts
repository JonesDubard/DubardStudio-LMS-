export type AccessTokenClaims = {
  app_role: string | null;
  tenantId: string | null;
};

/** Reads app_role and tenant_id from an access-token payload. Does not verify the signature. */
export function readAccessTokenClaims(accessToken: string): AccessTokenClaims {
  const segment = accessToken.split(".")[1];
  if (!segment) {
    return { app_role: null, tenantId: null };
  }

  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    const app_role = typeof payload.app_role === "string" ? payload.app_role : null;
    const tenantId =
      typeof payload.tenant_id === "string" ? payload.tenant_id : null;
    return { app_role, tenantId };
  } catch {
    return { app_role: null, tenantId: null };
  }
}
