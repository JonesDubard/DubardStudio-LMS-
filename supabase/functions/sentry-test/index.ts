// POST /functions/v1/sentry-test   (NF-17.4)
//
// Sends ONE test error to Sentry, tagged with the caller's school and role, so
// the team can confirm the setup and see that no personal data is attached.
// Only a school admin can call it. Undeploy it once the test has passed:
//   supabase functions delete sentry-test
//
//   curl -X POST "$SUPABASE_URL/functions/v1/sentry-test" \
//     -H "Authorization: Bearer <access token of a school admin>" \
//     -H "apikey: $SUPABASE_ANON_KEY"
//
// 200 -> { sent: true, event_id }    (sent: false = SENTRY_DSN is not set)

import { StorageError } from "../_shared/storage.ts";
import { corsHeaders, errorResponse, json } from "../_shared/http.ts";
import { authenticate } from "../_shared/auth.ts";
import { reportError } from "../_shared/sentry.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") throw new StorageError("invalid_input", 405, "Use POST.");
    const caller = await authenticate(req);
    if (!caller.roles.includes("school_admin")) {
      throw new StorageError("not_allowed", 403, "Only a school admin can send a test error.");
    }

    const eventId = await reportError(
      new Error("Sentry test error (NF-17.4). Safe to ignore."),
      { fn: "sentry-test", tenantId: caller.tenantId, roles: caller.roles },
    );
    return json({
      sent: Boolean(eventId),
      event_id: eventId ?? null,
      note: eventId ? undefined : "SENTRY_DSN is not set for this project.",
    });
  } catch (e) {
    return errorResponse(e);
  }
});