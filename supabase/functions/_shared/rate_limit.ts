// NF-07a: one shared rate-limit check for Edge Functions.
// Counts each request in public.rate_limit_counters (migration 0011) and
// refuses with 429 "try again in N seconds" (and a Retry-After header) when a
// caller is over the limit.

//
// Where each bucket is used:
//   upload  files-upload, per signed-in user   (wire up when NF-03 is merged)
//   invite  invite functions, per admin         (US-030, US-033, US-036, US-001.4)
//   import  CSV import, per school              (US-032a)
//
// Counted per user or per school only, never per IP address: a whole classroom
// often shares one IP, x-forwarded-for can be set by the caller, and every one of
// these functions needs a signed-in caller anyway. Login and password reset,
// where nobody is signed in yet, are limited per IP by Supabase Auth instead
// (docs/rate-limits.md).
//
// Fixed windows: a caller can send up to the limit at the end of one window and
// again at the start of the next. That's expected, and fine for these limits.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./admin.ts";

export type Bucket = "invite" | "import" | "upload";

/** Starting numbers (NF-07a.3). */
export const LIMITS: Record<
  Bucket,
  { limit: number; windowSeconds: number; per: "user" | "admin" | "school" }
> = {
  invite: { limit: 50, windowSeconds: 3600, per: "admin" },
  import: { limit: 5, windowSeconds: 3600, per: "school" },
  upload: { limit: 30, windowSeconds: 60, per: "user" },
};

export class RateLimitError extends HttpError {
  constructor(public retryAfterSeconds: number) {
    super(
      429,
      "rate_limited",
      `Too many requests. Try again in ${retryAfterSeconds} seconds.`,
      {
        "Retry-After": String(retryAfterSeconds),
      },
    );
    this.name = "RateLimitError";
  }
}

const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Counts one request for `id` (a user, admin or school id, see LIMITS) and throws
 * RateLimitError (429) when over the limit. Inside adminHandler that becomes the
 * response by itself; elsewhere, catch it and reply with err.status, err.message
 * and err.headers.
 */
export async function enforceRateLimit(
  db: SupabaseClient,
  bucket: Bucket,
  id: string,
): Promise<void> {
  const { limit, windowSeconds, per } = LIMITS[bucket];
  if (!UUID_FORMAT.test(id))
    throw new Error(`enforceRateLimit: "${bucket}" needs a ${per} id`);

  const { data, error } = await db.rpc("rate_limit_hit", {
    p_bucket: bucket,
    p_subject: `${per}:${id.toLowerCase()}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  // Fail closed: if we can't count, the request is refused (a 500), never let through.
  if (error) throw new Error(`rate_limit_hit failed: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as {
    allowed?: unknown;
    retry_after_seconds?: unknown;
  } | null;
  if (typeof row?.allowed !== "boolean")
    throw new Error("rate_limit_hit returned no result");
  if (!row.allowed)
    throw new RateLimitError(Math.max(1, Number(row.retry_after_seconds) || 1));
}
