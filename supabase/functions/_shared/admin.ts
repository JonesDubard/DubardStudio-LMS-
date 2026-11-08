// US-013: the admin path. Every Platform Admin Edge Function is built with
// adminHandler(), which
//   1. checks the caller is an active Platform Admin (US-013.2),
//   2. for "one_school" functions, takes exactly one tenant_id and hands the
//      function a client that is limited to that school (US-013.3),
//   3. writes an audit_log row for every outcome with writeAudit() (US-013.4, US-014).
// A function never creates its own service-role client; tests/admin_functions_test.ts checks that.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  type AuditResult,
  AuditWriteError,
  callerIp,
  writeAudit,
} from "./audit.ts";
import { serviceClient } from "./client.ts";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
    public headers?: Record<string, string>,
  ) {
    super(message ?? code);
    this.name = "HttpError";
  }
}

const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The admin portal sends the user's token in the Authorization header, not a
// cookie, so a wide origin can't be used to act as someone. Set ADMIN_APP_ORIGIN to narrow it.
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": Deno.env.get("ADMIN_APP_ORIGIN") ?? "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

/** The signed-in user's id. The token is checked by Supabase Auth, not just decoded. */
export async function callerId(
  req: Request,
  db: SupabaseClient,
): Promise<string> {
  const token = req.headers
    .get("Authorization")
    ?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new HttpError(401, "not_signed_in");
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "not_signed_in");
  return data.user.id;
}

/** Read from the table on every call, so a deactivated admin is refused at once, not when their token expires. */
export async function isActivePlatformAdmin(
  db: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await db
    .from("platform_admins")
    .select("is_active")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`platform_admins lookup failed: ${error.message}`);
  return data?.is_active === true;
}

// ---------------------------------------------------------------------------
// One school per call
// ---------------------------------------------------------------------------

/** Body keys that would ask for several schools at once. */
const MANY_SCHOOL_KEYS = ["tenant_ids", "tenants", "school_ids", "schools"];

/** Returns the one tenant_id in the body, after checking that school exists. */
export async function resolveOneSchool(
  db: SupabaseClient,
  body: Record<string, unknown>,
): Promise<string> {
  const raw = body.tenant_id;
  if (
    typeof raw !== "string" ||
    !UUID_FORMAT.test(raw) ||
    MANY_SCHOOL_KEYS.some((k) => k in body)
  ) {
    throw new HttpError(
      400,
      "one_school_required",
      "Send exactly one tenant_id.",
    );
  }
  const { data, error } = await db
    .from("tenants")
    .select("id")
    .eq("id", raw)
    .maybeSingle();
  if (error) throw new Error(`tenants lookup failed: ${error.message}`);
  if (!data) throw new HttpError(404, "school_not_found");
  return raw;
}

/**
 * Table access limited to one school. Every read, update and delete is filtered
 * on the school, and every insert is stamped with it. The tenants table is matched on id.
 * Add more filters after the call, e.g. school.select("lessons").eq("status", "published").
 */
export function schoolScope(db: SupabaseClient, tenantId: string) {
  const key = (table: string) => (table === "tenants" ? "id" : "tenant_id");
  const stamp = (table: string, row: Record<string, unknown>) => {
    if (table === "tenants")
      throw new HttpError(
        500,
        "internal",
        "Create schools with provision_tenant().",
      );
    if ("tenant_id" in row && row.tenant_id !== tenantId) {
      throw new HttpError(
        500,
        "internal",
        `refused: a row for another school in ${table}`,
      );
    }
    return { ...row, tenant_id: tenantId };
  };
  return {
    tenantId,
    select: (
      table: string,
      columns = "*",
      options?: { count?: "exact" | "planned" | "estimated"; head?: boolean },
    ) => db.from(table).select(columns, options).eq(key(table), tenantId),
    insert: (
      table: string,
      rows: Record<string, unknown> | Record<string, unknown>[],
    ) =>
      db
        .from(table)
        .insert(
          Array.isArray(rows)
            ? rows.map((r) => stamp(table, r))
            : stamp(table, rows),
        ),
    update: (table: string, values: Record<string, unknown>) => {
      if ("tenant_id" in values || (table === "tenants" && "id" in values)) {
        throw new HttpError(
          500,
          "internal",
          "refused: a row can't be moved to another school",
        );
      }
      return db.from(table).update(values).eq(key(table), tenantId);
    },
    delete: (table: string) => db.from(table).delete().eq(key(table), tenantId),
  };
}

export type SchoolScope = ReturnType<typeof schoolScope>;

// ---------------------------------------------------------------------------
// adminHandler
// ---------------------------------------------------------------------------

interface Common {
  req: Request;
  body: Record<string, unknown>;
  adminId: string;
}
/** Platform-wide functions: create a school, list schools, totals across schools (US-007, US-009, US-017). */
export interface PlatformContext extends Common {
  db: SupabaseClient;
}
/** Functions that look inside or change one school. They get no unscoped client. */
export interface SchoolContext extends Common {
  school: SchoolScope;
}

export interface Outcome {
  status?: number;
  body: unknown;
  /** The record the action was about, for the audit row. */
  resourceId?: string | null;
  /** Platform functions only: the school the action was about, if any (e.g. the school just created). */
  tenantId?: string | null;
  details?: Record<string, unknown>;
}

interface Options {
  /** "<thing>.<verb>", e.g. "tenant.create". */
  action: string;
  resourceType: string;
  /**
   * true when the database function the handler calls writes the success row
   * itself, in the same transaction as the change (e.g. provision_tenant()).
   * Use this for every write, so a change is never saved without its audit row.
   * Refusals and errors are still written here.
   */
  auditedInDatabase?: boolean;
  /** For tests only. */
  db?: () => SupabaseClient;
}

export function adminHandler(
  opts: Options & { scope: "platform" },
  run: (ctx: PlatformContext) => Promise<Outcome>,
): (req: Request) => Promise<Response>;
export function adminHandler(
  opts: Options & { scope: "one_school" },
  run: (ctx: SchoolContext) => Promise<Outcome>,
): (req: Request) => Promise<Response>;
export function adminHandler(
  opts: Options & { scope: "platform" | "one_school" },
  // deno-lint-ignore no-explicit-any
  run: (ctx: any) => Promise<Outcome>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: corsHeaders() });
    if (req.method !== "POST")
      return json(405, { error: "method_not_allowed" });

    const db = opts.db ? opts.db() : serviceClient();
    let actorId: string | null = null;
    let tenantId: string | null = null;
    let requested: unknown = null;

    const audit = (
      result: AuditResult,
      reason: string | null,
      extra: Partial<Outcome> = {},
    ) =>
      writeAudit(db, {
        actorId,
        actorKind: "platform_admin",
        tenantId: extra.tenantId ?? tenantId,
        action: opts.action,
        resourceType: opts.resourceType,
        resourceId: extra.resourceId ?? null,
        result,
        reason,
        details: {
          ...(extra.details ?? {}),
          ...(tenantId === null &&
          typeof requested === "string" &&
          UUID_FORMAT.test(requested)
            ? { requested_tenant_id: requested }
            : {}),
        },
        ipAddress: callerIp(req),
      });

    try {
      actorId = await callerId(req, db);
      if (!(await isActivePlatformAdmin(db, actorId)))
        throw new HttpError(403, "not_platform_admin");

      let body: Record<string, unknown>;
      try {
        const parsed = await req.json();
        if (
          parsed === null ||
          typeof parsed !== "object" ||
          Array.isArray(parsed)
        )
          throw new Error();
        body = parsed;
      } catch {
        throw new HttpError(400, "bad_json", "Send a JSON object.");
      }
      requested = body.tenant_id;

      let outcome: Outcome;
      if (opts.scope === "one_school") {
        tenantId = await resolveOneSchool(db, body);
        outcome = await run({
          req,
          body,
          adminId: actorId,
          school: schoolScope(db, tenantId),
        });
      } else {
        outcome = await run({ req, body, adminId: actorId, db });
      }

      // Written before the reply, so nothing is returned without its audit row.
      if (!opts.auditedInDatabase) await audit("success", null, outcome);
      return json(outcome.status ?? 200, outcome.body);
    } catch (err) {
      if (err instanceof AuditWriteError) {
        console.error(err.message);
        return json(500, { error: "audit_write_failed" });
      }
      const status = err instanceof HttpError ? err.status : 500;
      const code = err instanceof HttpError ? err.code : "internal";
      if (!(err instanceof HttpError)) console.error(err);

      // No row when nobody could be identified: a missing or bad token is
      // already refused by Supabase, and logging those would let anyone fill the log.
      if (status !== 401) {
        try {
          await audit(status === 403 ? "denied" : "error", code);
        } catch (auditErr) {
          console.error(
            auditErr instanceof Error ? auditErr.message : auditErr,
          );
          return json(500, { error: "audit_write_failed" });
        }
      }
      const message =
        err instanceof HttpError && err.message !== code && status < 500
          ? err.message
          : undefined;
      const extraHeaders = err instanceof HttpError ? err.headers : undefined;
      return json(
        status,
        message ? { error: code, message } : { error: code },
        extraHeaders,
      );
    }
  };
}
