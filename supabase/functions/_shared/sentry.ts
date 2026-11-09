// Sentry for the Edge Functions (NF-17.2).
//
// Usage, in a function's catch block:
//   await reportError(e, { fn: "files-upload", tenantId: caller?.tenantId, roles: caller?.roles });
//
// Secrets (supabase secrets set ...):
//   SENTRY_DSN          from the Sentry project. Without it this file does nothing.
//   SENTRY_ENVIRONMENT  optional, default "production"
//
// Each error is sent inside its own scope (Sentry.withScope) with the tags from
// buildTags, because the SDK does not separate requests by itself in Deno.serve.
//
// The SDK is loaded only when SENTRY_DSN is set, on the first real error. Tests
// and functions without a DSN never import it, and never need env permission.
// Pin the version: replace ^8 with the exact one in supabase/functions/deno.lock.

import {
  buildTags,
  redact,
  reportableError,
  scrubEvent,
  shouldReport,
} from "./sentry_scrub.ts";
import type { ErrorContext } from "./sentry_scrub.ts";

type SentrySdk = typeof import("npm:@sentry/deno@^8");
let sdk: SentrySdk | null = null;

async function load(): Promise<SentrySdk | null> {
  if (sdk) return sdk;
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) return null;
  const Sentry = await import("npm:@sentry/deno@^8");
  Sentry.init({
    dsn,
    environment: Deno.env.get("SENTRY_ENVIRONMENT") ?? "production",
    defaultIntegrations: false, // no automatic request data, no breadcrumbs
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event) as typeof event,
  });
  sdk = Sentry;
  return sdk;
}

/**
 * Sends the error to Sentry (if it is a real failure and SENTRY_DSN is set) and
 * waits until it has left, so it is not lost when the function stops.
 * Returns the Sentry event id, or undefined when nothing was sent.
 * Never throws: reporting must not break the response.
 */
export async function reportError(
  e: unknown,
  ctx: ErrorContext,
): Promise<string | undefined> {
  if (!shouldReport(e)) return undefined;
  const safe = reportableError(e);
  // The same sanitised error that Sentry gets: code or message plus frames, no emails.
  // This is all the Supabase logs hold when Sentry is off or unreachable.
  console.error(`[${ctx.fn}]`, redact((safe.stack ?? safe.message).slice(0, 2000)));
  try {
    const Sentry = await load();
    if (!Sentry) return undefined;
    const id = Sentry.withScope((scope) => {
      scope.setTags(buildTags(ctx));
      return Sentry.captureException(safe);
    });
    await Sentry.flush(2000);
    return id;
  } catch (sendError) {
    console.error("sentry: could not send", sendError instanceof Error ? sendError.name : "error");
    return undefined;
  }
}