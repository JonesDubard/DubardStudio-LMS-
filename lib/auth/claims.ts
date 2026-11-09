export type AccessTokenClaims = {
  /** Roles from the `app_roles` array. A legacy `app_role` string becomes a one-item list. */
  app_roles: string[];
  /** First role, for callers that still expect one value. */
  app_role: string | null;
  tenantId: string | null;
};

const EMPTY: AccessTokenClaims = {
  app_roles: [],
  app_role: null,
  tenantId: null,
};

function readRoles(payload: Record<string, unknown>): string[] {
  if (Array.isArray(payload.app_roles)) {
    return payload.app_roles.filter(
      (role): role is string => typeof role === "string" && role.length > 0,
    );
  }
  if (typeof payload.app_role === "string" && payload.app_role.length > 0) {
    return [payload.app_role];
  }
  return [];
}

/** Reads app_roles and tenant_id from an access-token payload. Does not verify the signature. */
export function readAccessTokenClaims(accessToken: string): AccessTokenClaims {
  const segment = accessToken.split(".")[1];
  if (!segment) return EMPTY;

  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    const app_roles = readRoles(payload);
    const tenantId =
      typeof payload.tenant_id === "string" ? payload.tenant_id : null;
    return { app_roles, app_role: app_roles[0] ?? null, tenantId };
  } catch {
    return EMPTY;
  }
}
