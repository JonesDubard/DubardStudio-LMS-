// US-014: the one way Edge Functions write to public.audit_log (MIG-0010).
// audit_log is append-only and only the service role can insert, so this
// needs the service-role client from client.ts.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type AuditResult = "success" | "denied" | "error";

export interface AuditEntry {
    /** Who: the auth user id, or null when nobody could be identified. */
    actorId: string | null;
    actorKind?: "platform_admin" | "system" | "user";
    /** School: only a tenant id that is known to exist (the column has a foreign key). */
    tenantId: string | null;
    /** What was done, as "<thing>.<verb>", e.g. "tenant.create". */
    action: string;
    /** Record: the kind of row and its id. */
    resourceType: string;
    resourceId?: string | null;
    result: AuditResult;
    /** Short error or refusal code, e.g. "not_platform_admin". */
    reason?: string | null;
    details?: Record<string, unknown>;
    ipAddress?: string | null;
}

export class AuditWriteError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AuditWriteError";
    }
}

const ACTION_FORMAT = /^[a-z][a-z_]*\.[a-z][a-z_]*$/;
const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Writes one audit row. Throws AuditWriteError if the row was not saved. Time is set by the database. */
export async function writeAudit(db: SupabaseClient, entry: AuditEntry): Promise<void> {
    if (!ACTION_FORMAT.test(entry.action)) {
        throw new AuditWriteError(`bad audit action "${entry.action}": use "<thing>.<verb>"`);
    }
    if (!entry.resourceType) throw new AuditWriteError("audit resourceType is required");
    for (
        const [name, value] of [["actorId", entry.actorId], ["tenantId", entry.tenantId], ["resourceId", entry.resourceId]]
    ) {
        if (value != null && !UUID_FORMAT.test(value)) throw new AuditWriteError(`audit ${name} is not a uuid`);
    }

    const { error } = await db.from("audit_log").insert({
        actor_id: entry.actorId,
        actor_kind: entry.actorKind ?? "platform_admin",
        tenant_id: entry.tenantId,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId ?? null,
        result: entry.result,
        reason: entry.reason ?? null,
        details: entry.details ?? {},
        ip_address: entry.ipAddress ?? null,
    });
    if (error) throw new AuditWriteError(`audit_log insert failed: ${error.message}`);
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

/** The caller's IP from x-forwarded-for, or null. A bad value would make the insert fail, so anything odd is dropped. */
export function callerIp(req: Request): string | null {
    const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    if (IPV4.test(first) || (first.includes(":") && IPV6.test(first))) return first;
    return null;
}
