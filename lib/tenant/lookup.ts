// US-002.1: which school does a subdomain belong to?
// Uses the public get_branding() function from 0010, so it works before sign-in
// and shares one subdomain rule with the login page's branding.

export type SchoolLookup = { kind: "ok"; tenantId: string } | { kind: "not_found" };

/** The one Supabase call we need. Any Supabase client (browser, server, middleware) fits. */
export type RpcClient = {
    rpc: (
        fn: "get_branding",
        args: { p_subdomain: string },
    ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

// Middleware runs on every request, so remember answers for a minute.
// A school created a moment ago may show "not found" for up to a minute.
const TTL_MS = 60_000;
const cache = new Map<string, { value: SchoolLookup; expires: number }>();

export async function lookupSchool(
    db: RpcClient,
    subdomain: string,
    now: number = Date.now(),
): Promise<SchoolLookup> {
    const key = subdomain.trim().toLowerCase();
    const hit = cache.get(key);
    if (hit && hit.expires > now) return hit.value;

    const { data, error } = await db.rpc("get_branding", { p_subdomain: key });
    // Don't cache errors, and don't treat them as "not found".
    if (error) throw new Error(`get_branding failed: ${error.message}`);

    const row = (Array.isArray(data) ? data[0] : data) as { tenant_id?: unknown } | null | undefined;
    const value: SchoolLookup =
        typeof row?.tenant_id === "string"
            ? { kind: "ok", tenantId: row.tenant_id }
            : { kind: "not_found" };

    cache.set(key, { value, expires: now + TTL_MS });
    return value;
}

/** For tests. */
export function clearSchoolLookupCache(): void {
    cache.clear();
}
